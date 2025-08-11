// src/components/Register.jsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  TextField,
  Typography,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import EmailIcon from "@mui/icons-material/Email";

const AUTH_BASE = "http://localhost:8547/auth"; // backend auth base

export function Register({ onRegistered }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleBlur = (e) =>
    setTouched((t) => ({ ...t, [e.target.name]: true }));

  const emailValid = /\S+@\S+\.\S+/.test(form.email);
  const nameEmpty = !form.name.trim();
  const pwTooShort = !form.password || form.password.length < 6;

  const formInvalid = nameEmpty || !emailValid || pwTooShort;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    setMessage("");
    setOk("");

    if (formInvalid) return;

    setSubmitting(true);
    try {
      // x-www-form-urlencoded body
      const body = new URLSearchParams({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      }).toString();

      const res = await fetch(`${AUTH_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      if (!res.ok) {
        let detail = "Registration failed";
        try {
          const data = await res.json();
          detail = data.detail || detail;
        } catch {}
        setMessage(detail);
        return;
      }

      setOk("Account created. You can log in now.");
      try {
        localStorage.setItem("lastRegisteredEmail", form.email.trim());
      } catch {}
      onRegistered?.(form.email.trim()); // parent can switch to Login & prefill
      setForm({ name: "", email: "", password: "" });
    } catch {
      setMessage("Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      elevation={3}
      sx={{ maxWidth: 460, mx: "auto", mt: 3, borderRadius: 3 }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={700} textAlign="center">
              Create an account
            </Typography>

            {message && <Alert severity="error">{message}</Alert>}
            {ok && <Alert severity="success">{ok}</Alert>}

            <TextField
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              fullWidth
              autoComplete="name"
              error={touched.name && nameEmpty}
              helperText={touched.name && nameEmpty ? "Name is required" : " "}
            />

            <TextField
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              fullWidth
              autoComplete="email"
              error={touched.email && !emailValid}
              helperText={
                touched.email && !emailValid ? "Enter a valid email" : " "
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <EmailIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Password"
              name="password"
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              fullWidth
              autoComplete="new-password"
              error={touched.password && pwTooShort}
              helperText={
                touched.password && pwTooShort ? "Minimum 6 characters" : " "
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPw((s) => !s)}
                      edge="end"
                    >
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </CardContent>

        <CardActions sx={{ px: 2, pb: 2 }}>
          <LoadingButton
            type="submit"
            variant="contained"
            fullWidth
            loading={submitting}
            disabled={formInvalid || submitting}
            disableElevation
            sx={{ py: 1.1, borderRadius: 2 }}
          >
            Register
          </LoadingButton>
        </CardActions>
      </form>
    </Card>
  );
}
