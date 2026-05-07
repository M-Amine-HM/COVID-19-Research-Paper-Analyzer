from __future__ import annotations

from collections import Counter
from pathlib import Path
import logging
import re
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import nltk
from nltk.corpus import stopwords
import spacy
from gensim.models import Word2Vec
from gensim.models.keyedvectors import KeyedVectors

app = FastAPI(title="COVID-19 Research Paper Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"

RF_MODEL_PATH = MODELS_DIR / "rf_model.joblib"
TFIDF_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"
W2V_PATH = MODELS_DIR / "word2vec_model.gensim"

ENTITY_LABELS = {"ORG", "PRODUCT", "PERSON", "LOC", "DATE", "GPE"}

_TOKEN_CLEAN_RE = re.compile(r"[^a-z\s]")


class AnalyzeRequest(BaseModel):
    abstract: str


class AnalyzeResponse(BaseModel):
    category: str
    confidence: float
    entities: List[dict]
    suggestions: List[str]


rf_model = None
vectorizer = None
w2v = None
nlp = None
stop_words = None


def _ensure_nltk_data() -> None:
    try:
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords")

    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt")


def _load_w2v(path: Path) -> KeyedVectors:
    try:
        model = Word2Vec.load(str(path))
        return model.wv
    except Exception:
        return KeyedVectors.load(str(path), mmap="r")


def _preprocess(text: str) -> List[str]:
    lowered = text.lower()
    cleaned = _TOKEN_CLEAN_RE.sub(" ", lowered)
    tokens = nltk.word_tokenize(cleaned)
    return [tok for tok in tokens if tok not in stop_words and len(tok) > 2]


def _predict_category(cleaned_text: str) -> tuple[str, float]:
    features = vectorizer.transform([cleaned_text])
    predicted = rf_model.predict(features)[0]

    label_map = {
        1: "Treatment & Clinical Trials",
        0: "Public Health / Other",
    }
    category = label_map.get(int(predicted), "Public Health / Other")

    confidence = 1.0
    if hasattr(rf_model, "predict_proba"):
        probs = rf_model.predict_proba(features)[0]
        class_index = list(rf_model.classes_).index(predicted)
        confidence = float(probs[class_index])

    return category, round(confidence * 100, 2)


def _extract_entities(text: str) -> List[dict]:
    doc = nlp(text)
    entities = []
    for ent in doc.ents:
        if ent.label_ in ENTITY_LABELS:
            entities.append({"text": ent.text, "label": ent.label_})
    return entities


def _suggest_keywords(tokens: List[str]) -> List[str]:
    valid_tokens = [tok for tok in tokens if tok in w2v.key_to_index]
    if not valid_tokens:
        return []

    most_common_token = Counter(valid_tokens).most_common(1)[0][0]
    similar = w2v.most_similar(most_common_token, topn=4)
    return [word for word, _score in similar]


@app.on_event("startup")
def startup() -> None:
    global rf_model, vectorizer, w2v, nlp, stop_words

    _ensure_nltk_data()
    stop_words = set(stopwords.words("english"))

    if not RF_MODEL_PATH.exists() or not TFIDF_PATH.exists() or not W2V_PATH.exists():
        missing = [
            str(p) for p in [RF_MODEL_PATH, TFIDF_PATH, W2V_PATH] if not p.exists()
        ]
        logging.error("Missing model files: %s", missing)
        return

    rf_model = joblib.load(RF_MODEL_PATH)
    vectorizer = joblib.load(TFIDF_PATH)
    w2v = _load_w2v(W2V_PATH)
    nlp = spacy.load("en_core_web_sm")


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    if not request.abstract.strip():
        raise HTTPException(
            status_code=400, detail="Abstract cannot be empty.")

    if rf_model is None or vectorizer is None or w2v is None or nlp is None:
        raise HTTPException(status_code=500, detail="Models are not loaded.")

    tokens = _preprocess(request.abstract)
    cleaned_text = " ".join(tokens)

    category, confidence = _predict_category(cleaned_text)
    entities = _extract_entities(request.abstract)
    suggestions = _suggest_keywords(tokens)

    return AnalyzeResponse(
        category=category,
        confidence=confidence,
        entities=entities,
        suggestions=suggestions,
    )
