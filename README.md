# COVID-19 Research Paper Analyzer

Full-stack web app for classifying COVID-19 paper abstracts, extracting entities, and suggesting related keywords.

## Project Structure

```
backend/
  main.py
  requirements.txt
frontend/
  index.html
  package.json
  postcss.config.js
  tailwind.config.js
  vite.config.js
  src/
    App.jsx
    index.css
    main.jsx
models/
  rf_model.joblib
  tfidf_vectorizer.joblib
  word2vec_model.gensim
```

## Backend (FastAPI)

1. Create and activate a virtual environment.
2. Install dependencies:

```
pip install -r backend/requirements.txt
```

3. Download spaCy model:

```
python -m spacy download en_core_web_sm
```

4. Run the API:

```
python -m uvicorn backend.main:app --reload --port 8000
```

## Frontend (Vite + React + Tailwind)

1. Install dependencies:

```
cd frontend
npm install
```

2. Start the dev server:

```
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

## Notes

- Place the trained models in `models/` at the project root.
- If you plan to share the repo, store models in a separate download location (cloud storage or release assets) and document the link here.
- NLTK downloads required data on first startup.
