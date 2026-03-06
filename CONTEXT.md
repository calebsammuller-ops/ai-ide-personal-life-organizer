
# Project Overview

The AI IDE - Personal Life Organizer is a mobile app designed to help individuals manage their daily lives, prioritize tasks, and maintain a healthy balance between work, habits, and personal time. The app is built using Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

The app's core features include:

* Smart Calendar Engine: creates and reorganizes schedules
* Daily Life Planner: generates a daily plan
* Habit Management: builds and tracks habits
* Meal Planning: schedules meals
* Thought Organization: converts unstructured thoughts into priorities
* Live Assistant: provides live guidance and reminders
* Personal Learning: learns user preferences and routines

# Tech Stack

The app uses the following technologies:

* **Next.js 14**: for building the app's frontend
* **TypeScript**: for writing type-safe JavaScript code
* **Tailwind CSS**: for styling the app's UI
* **shadcn/ui**: for UI components and design
* **Supabase**: for storing and managing user data

# Architecture

The app's architecture is based on a component-based approach, with the following main components:

* **Components**: reusable UI components for displaying data
* **Services**: backend services for processing data and performing tasks
* **State Management**: using Redux to manage global state

The app's components are organized into the following folders:

* **components**: reusable UI components
* **containers**: higher-order components for wrapping and managing child components
* **pages**: individual pages for displaying data
* **services**: backend services for processing data

# Folder Structure

The app's folder structure is as follows:

* **components**: reusable UI components
	+ **calendar**: calendar-related components
	+ **habits**: habit-related components
	+ **meal-planning**: meal planning-related components
	+ **thought-organization**: thought organization-related components
	+ **live-assistant**: live assistant-related components
* **containers**: higher-order components for wrapping and managing child components
	+ **calendar-container**: calendar container component
	+ **habit-container**: habit container component
	+ **meal-planning-container**: meal planning container component
	+ **thought-organization-container**: thought organization container component
	+ **live-assistant-container**: live assistant container component
* **pages**: individual pages for displaying data
	+ **index**: main app page
	+ **calendar**: calendar page
	+ **habits**: habit page
	+ **meal-planning**: meal planning page
	+ **thought-organization**: thought organization page
	+ **live-assistant**: live assistant page
* **services**: backend services for processing data
	+ **calendar-service**: calendar-related service
	+ **habit-service**: habit-related service
	+ **meal-planning-service**: meal planning-related service
	+ **thought-organization-service**: thought organization-related service
	+ **live-assistant-service**: live assistant-related service
* **state**: Redux store for managing global state
* **styles**: global styles for the app

# Key Decisions

* **State Management**: using Redux for managing global state
* **Component-Based Architecture**: using a component-based approach for building the app
* **Type Safety**: using TypeScript for writing type-safe JavaScript code
* **Supabase**: using Supabase for storing and managing user data

# Implementation Guidelines

* **Code Style**: following the Airbnb JavaScript Style Guide
* **Naming Conventions**: using camelCase for variable and function names
* **Best Practices**: following best practices for coding, debugging, and testing

# Features Breakdown

The app's features are broken down into the following sections:

* **Smart Calendar Engine**: creates and reorganizes schedules
* **Daily Life Planner**: generates a daily plan
* **Habit Management**: builds and tracks habits
* **Meal Planning**: schedules meals
* **Thought Organization**: converts unstructured thoughts into priorities
* **Live Assistant**: provides live guidance and reminders
* **Personal Learning**: learns user preferences and routines

# API & Database

The app uses the following API routes:

* **/api/calendar**: for creating and retrieving calendar events
* **/api/habits**: for creating and retrieving habits
* **/api/meal-planning**: for creating and retrieving meal plans
* **/api/thought-organization**: for converting unstructured thoughts into priorities
* **/api/live-assistant**: for providing live guidance and reminders
* **/api/personal-learning**: for learning user preferences and routines

The app uses Supabase for storing and managing user data. The database schema is as follows:

* **users**: for storing user information
* **calendars**: for storing calendar events
* **habits**: for storing habits
* **meal-planning**: for storing meal plans
* **thought-organization**: for storing unstructured thoughts and priorities
* **live-assistant**: for storing live guidance and reminders
* **personal-learning**: for storing user preferences and routines

This comprehensive CONTEXT.md file provides a detailed overview of the AI IDE - Personal Life Organizer, including its features, architecture, tech stack, and implementation guidelines. It serves as a guide for building the app correctly and ensuring consistency throughout the development process.