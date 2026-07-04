# Customer Churn Prediction Platform

A full-stack application that predicts whether a customer is likely to churn using machine learning.

## Project Structure

```text
churn-prediction-project/
├── churn-backend/     Spring Boot + Weka + MySQL
└── churn-dashboard/   React (Vite)
```

## About the Project

I built this project to understand how machine learning models can be integrated into real-world business applications. The system analyzes customer details such as account information, usage patterns, and support history to predict the possibility of customer churn.

The backend uses Spring Boot and Apache Weka with a Random Forest classifier, while the frontend provides an interactive dashboard for visualizing customer insights and making live predictions.

## Features

* Trains a Random Forest model using Apache Weka
* Performs feature engineering and preprocessing in Java
* Generates real-time churn predictions through REST APIs
* Classifies customers into Low, Medium, or High risk categories
* Displays analytics through charts, KPIs, and customer tables
* Includes a form to test predictions with custom customer data
* Stores customer information in MySQL

## Running the Backend

```bash
cd churn-backend
```

Create a MySQL database:

```sql
CREATE DATABASE churn_db;
```

Update your database credentials in:

```text
src/main/resources/application.properties
```

Then start the application:

```bash
mvn spring-boot:run
```

When the project runs for the first time, it automatically generates around 800 sample customer records and trains the initial model.

Backend URL:

```text
http://localhost:8080
```

## Running the Frontend

```bash
cd churn-dashboard
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## System Architecture

```text
React Dashboard
      │
      ▼
Spring Boot REST API
      │
      ├── Feature Engineering Service
      │
      ▼
Weka Random Forest Model
      │
      ▼
MySQL Database
```

## Implementation Details

The Feature Engineering Service ensures that both training data and real-time inputs follow the same structure and preprocessing steps.

The model service handles:

* Training and retraining
* Model evaluation
* Saving and loading trained models
* Real-time probability predictions

To make the project easy to demonstrate, a data seeding component generates realistic customer records during the first startup. These can later be replaced with actual business data.

## Future Improvements

Some features that can be added in the future include:

* Importing customer data from CSV files
* User authentication with Spring Security
* Automatic retraining at regular intervals
* Model version tracking and comparison with other algorithms
* Deployment using Docker and cloud services
