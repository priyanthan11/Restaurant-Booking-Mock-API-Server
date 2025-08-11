import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  TextField,
  Typography,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const AUTH_BASE = "http://localhost:8547/auth";
export function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [touched, setTouched] = useState({ username: false, password: false });
  const [showPw, setShowPw] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const usernameEmpty = !form.username.trim();
  const passwordEmpty = !form.password;

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleBlur = (e) =>
    setTouched((t) => ({ ...t, [e.target.name]: true }));

  const validateBeforeSubmit = () => {
    const errors = {
      username: !form.username.trim(),
      password: !form.password,
    };
    setTouched({ username: true, password: true });
    return !errors.username && !errors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!validateBeforeSubmit()) return;

    setSubmitting(true);
    try {
      const params = new URLSearchParams();
      params.append("username", form.username.trim());
      params.append("password", form.password);

      const res = await fetch(`${AUTH_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: form.username.trim(),
          password: form.password,
        }).toString(),
      });

      if (!res.ok) {
        let detail = "Login failed";
        try {
          const data = await res.json();
          detail = data.detail || detail;
        } catch {}
        setMessage(detail);
        return;
      }
      const data = await res.json();
      onLoginSuccess?.(data.access_token);
    } catch {
      setMessage("Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      elevation={3}
      sx={{ maxWidth: 460, mx: "auto", mt: 4, borderRadius: 3 }}
    >
      <form onSubmit={handleSubmit} noValidate>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700} textAlign="center">
              Welcome back
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              Log in to manage your bookings
            </Typography>

            {message && <Alert severity="error">{message}</Alert>}

            <TextField
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              fullWidth
              autoComplete="username"
              error={touched.username && usernameEmpty}
              helperText={
                touched.username && usernameEmpty ? "Username is required" : " "
              }
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
              autoComplete="current-password"
              error={touched.password && passwordEmpty}
              helperText={
                touched.password && passwordEmpty ? "Password is required" : " "
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
            disableElevation
            sx={{ py: 1.2, borderRadius: 2 }}
            disabled={usernameEmpty || passwordEmpty || submitting}
          >
            Login
          </LoadingButton>
        </CardActions>
      </form>
    </Card>
  );
}
