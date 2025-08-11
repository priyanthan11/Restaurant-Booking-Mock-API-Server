// src/App.js
import { useState } from "react";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import BookingForm from "./components/BookingForm";
import { Box, Container, Paper, Tabs, Tab, Typography } from "@mui/material";
import "./App.css";

export default function App() {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState(0); // 0 = login, 1 = register

  if (token) return <BookingForm authToken={token} />;

  return (
    <Box className="auth-shell">
      <Container maxWidth="sm">
        <Typography
          variant="h4"
          fontWeight={800}
          textAlign="center"
          sx={{ mb: 3, letterSpacing: 0.2 }}
        >
          Welcome! Please login or register.
        </Typography>

        <Paper elevation={0} sx={{ mb: 2, background: "transparent" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            centered
            sx={{
              "& .MuiTab-root": { fontWeight: 700, textTransform: "none" },
            }}
          >
            <Tab label="Login" />
            <Tab label="Create account" />
          </Tabs>
        </Paper>

        {tab === 0 ? (
          <Login onLoginSuccess={setToken} />
        ) : (
          <Register onRegistered={() => setTab(0)} />
        )}
      </Container>
    </Box>
  );
}
