# Gluco

## 1. Team Details

- **Team:** BLACKBOX
- **Member:** BALASWAMY NAIK DEVASOTHU

## 2. College Information

- **Institution:** Rajiv Gandhi University of Knowledge Technologies, Nuzvid

## 3. Project Title

- **Gluco**

## 4. Problem Statement

Healthcare teams can miss early warning signs when patient monitoring data is fragmented across different systems. Clinicians need a focused view of current physiological state, recent trends, historical context, and explainable future risk.

Gluco addresses this problem by presenting patient monitoring signals and a model-based glucose risk forecast in one interface.

### Solution

Gluco provides a predictive patient-monitoring workflow through GlucoTwin. It combines historical patient information with simulated dynamic physiological observations, calculates recent glucose trends, and uses the existing Random Forest model to estimate the risk of a glucose rise within the next 2 hours. The interface separates the current physiological state from future risk and presents the calculated glucose slope, glucose change, and glucose variability to make risk changes easier to understand.

## 5. Healthcare Use Case

Gluco supports patient monitoring and proactive review by:

- Showing historical patient context, including sex and HbA1c.
- Displaying simulated live glucose, heart rate, and IBI observations.
- Calculating recent 15-, 30-, and 60-minute glucose trends.
- Explaining risk changes using glucose slope, glucose change, and glucose variability.
- Predicting the risk of a glucose rise of at least 30 mg/dL within the next 2 hours.
- Helping healthcare teams prioritize patients for follow-up.

The data stream is simulated from an open-source dataset replay. The application does not claim to use real-time sensors or provide clinical validation.

## 6. Technical Stack

| Area | Technologies |
| --- | --- |
| Frontend | React.js, React Router, Tailwind CSS, Chart.js, Axios |
| Backend | Python, Flask, Flask-CORS |
| Data and inference | pandas, NumPy, joblib, scikit-learn |
| Model input | Historical patient attributes and engineered temporal physiological features |
| API | REST endpoints for patients, live observations, reset, and model metadata |

## 7. AI/ML Models and Framework Details

- **Model:** GlucoTwin Random Forest pipeline
- **Model artifact:** Existing scikit-learn pipeline loaded from `backend/glucotwin/model/glucotwin_model.pkl`
- **Temporal features:** Glucose mean, standard deviation, change, and slope across recent time windows
- **Prediction target:** `Glucose rise >= 30 mg/dL within next 2 hours`
- **Metrics:** Accuracy **87.96%**, Precision **62.72%**, Recall **76.98%**, F1 **69.13%**, PR-AUC **81.33%**, and ROC-AUC **91.46%**
- **Inference:** The Flask service loads the saved model and applies `predict_proba()` to replay observations. The model is not retrained in the application and predictions are not hard-coded.
- **Explainability:** The interface uses calculated glucose slope, glucose change, and glucose variability to explain why risk is changing.

## 8. Demo Video

- **Public demo video link:** To be added later.

## 9. Open-Source License Details

- **License:** MIT License
- The project files and links are provided publicly without additional permissions.
- This project is intended for educational and research purposes. It does not replace licensed clinical diagnosis, treatment planning, or emergency care.

## 10. Architecture Diagram

- **[System architecture diagram (PDF)](./system-architecture.pdf)**

## 11. Project Presentation

- **Public presentation PDF covering project details and outcomes: https://github.com/BalaswamyNaikD/GlucoTwin/blob/1ef811f23a9daa22cc70ee0dffee00de9fb475ea/GlucoTwin_Presentation.pdf

## Render Deployment

The repository includes a [`render.yaml`](./render.yaml) Blueprint for deploying the backend, appointment service, and React frontend as separate Render services.

### Deployment Steps

1. Push the complete project folder to a public GitHub repository.
2. In Render, select **New → Blueprint**.
3. Connect the GitHub repository and select the branch containing `render.yaml`.
4. Review the three services created by the Blueprint:
   - `ai-smart-hospital-backend`
   - `ai-smart-hospital-appointments`
   - `ai-smart-hospital-frontend`
5. Add the required secret environment variables when Render prompts for them:
   - Backend: `HUGGINGFACE_API_KEY`
   - Appointment service: `MONGODB_URI`
6. Deploy the Blueprint.
7. Wait for the backend and appointment service health checks to pass:
   - Backend: `/api/health`
   - Appointment service: `/health`
8. Open the frontend Render URL and test login, patient monitoring, GlucoTwin prediction, and appointment functionality.

### Render Configuration

- The backend uses `backend/runtime.txt` to pin Python 3.11.11.
- The backend binds to Render's dynamically assigned `$PORT`.
- The frontend receives the backend and appointment-service URLs at build time through `REACT_APP_API_ORIGIN`, `REACT_APP_API_URL`, `REACT_APP_BOOKING_API_ORIGIN`, and `REACT_APP_BOOKING_API_URL`.
- The backend CORS configuration in `render.yaml` allows the frontend Render origin.
- The frontend uses a rewrite to `/index.html` so React Router routes work on refresh.
- Do not commit `.env` files, API keys, database credentials, or other secrets. Configure them in the Render dashboard.

## Docker Deployment

Docker files are included for the backend, appointment service, and frontend:

- [`backend/Dockerfile`](./backend/Dockerfile)
- [`appointment-service/Dockerfile`](./appointment-service/Dockerfile)
- [`frontend/Dockerfile`](./frontend/Dockerfile)
- [`frontend/nginx.conf`](./frontend/nginx.conf)
- [`docker-compose.yml`](./docker-compose.yml)

### Docker Compose Steps

1. Install Docker Desktop.
2. From the project root, optionally create a `.env` file with `SECRET_KEY`, `HUGGINGFACE_API_KEY`, and `MONGODB_URI`.
3. Build and start all services:

   ```bash
   docker compose up --build
   ```

4. Open the frontend at `http://localhost:3000`.
5. Verify the backend at `http://localhost:5000/api/health`.
6. Verify the appointment service at `http://localhost:5001/health`.

Stop the services with:

```bash
docker compose down
```
