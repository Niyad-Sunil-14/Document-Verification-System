import React, { useState } from "react";
import axiosInstance from "../../api/Axiosinstance";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post("auth/login/", formData);
        localStorage.setItem("access_token", response.data.access);
        localStorage.setItem("refresh_token", response.data.refresh);
        alert("Login Successful!");

      // 3. Redirect user or update App state
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid Email or Password");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />

      <button type="submit">Login</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
};

export default Login;
