# Employee Management System - Server Side

This repository contains the server-side code for the **Employee Management System**, facilitating secure and efficient backend operations.

## Features
1. **User Authentication**:
   - Secure login using JSON Web Tokens (JWT).

2. **Database Integration**:
   - MongoDB is used as the primary database for storing employee records and other data.

3. **Cross-Origin Resource Sharing (CORS)**:
   - Enabled for seamless interaction with the client-side application.

4. **Environment Variables**:
   - Configured with `dotenv` for secure handling of sensitive data.

5. **Payment Processing**:
   - Integrated with Stripe for managing financial transactions.

6. **Middleware Support**:
   - Cookie parsing enabled using `cookie-parser` for better session handling.

7. **RESTful APIs**:
   - Express is used to design and manage API endpoints for smooth client-server communication.

## Technologies Used
- **Backend Framework**: Express
- **Database**: MongoDB
- **Authentication**: JSON Web Tokens (JWT)
- **Payment Gateway**: Stripe
- **Environment Management**: Dotenv
- **Middleware**: CORS, Cookie-parser

---

### Installation Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Programming-Hero-Web-Course4/b10a12-server-side-abdullah107189.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd employee-management-server-side
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up environment variables:**
   - Create a `.env` file in the root directory and add the following:
     ```env
     PORT=4545
     MONGODB_URI=your-mongodb-connection-string
     JWT_SECRET=your-secret-key
     STRIPE_SECRET_KEY=your-stripe-secret-key
     ```

5. **Run the server:**
   ```bash
   npm start
   ```

6. **Test the server:**
   - Access the API at `http://localhost:4545`.

---

### API Endpoints

1. **User Authentication:**
   - `POST /api/auth/login`: User login endpoint.
   - `POST /api/auth/register`: User registration endpoint.

2. **Employee Management:**
   - `GET /api/employees`: Fetch all employees.
   - `POST /api/employees`: Add a new employee.
   - `PUT /api/employees/:id`: Update employee details.
   - `DELETE /api/employees/:id`: Remove an employee.

3. **Payments:**
   - `POST /api/payments`: Process a payment.

---

Feel free to explore, contribute, and provide feedback to make this server better!
