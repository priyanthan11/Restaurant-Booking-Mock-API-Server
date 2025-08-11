// src/App.js
import { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Button,
  Container,
} from "@mui/material";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import BookingForm from "./components/BookingForm";
import Profile from "./components/Profile"; // <-- import it
import "./App.css";

export default function App() {
  const [token, setToken] = useState(null);

  // unauthenticated view: tab between login/register
  const [authTab, setAuthTab] = useState(0); // 0 login, 1 register

  // authenticated view: tab between booking/profile
  const [appTab, setAppTab] = useState(0); // 0 booking, 1 profile

  const handleLogout = () => {
    setToken(null);
    setAppTab(0);
    // optional: clear app-specific localStorage on logout
    // localStorage.removeItem("myBookings");
  };

  // ---------------- Unauthenticated ----------------
  if (!token) {
    return (
      <Box className="auth-shell" sx={{ py: 4 }}>
        <Container maxWidth="sm">
          <Tabs
            value={authTab}
            onChange={(_, v) => setAuthTab(v)}
            centered
            sx={{
              mb: 3,
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700 },
            }}
          >
            <Tab label="Login" />
            <Tab label="Create account" />
          </Tabs>
          {authTab === 0 ? (
            <Login onLoginSuccess={setToken} />
          ) : (
            <Register onRegistered={() => setAuthTab(0)} />
          )}
        </Container>
      </Box>
    );
  }

  // ---------------- Authenticated ----------------
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Tabs
            value={appTab}
            onChange={(_, v) => setAppTab(v)}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{
              flexGrow: 1,
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700 },
            }}
          >
            <Tab label="Booking" />
            <Tab label="My Profile" />
          </Tabs>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {appTab === 0 ? (
          <BookingForm authToken={token} />
        ) : (
          <Profile authToken={token} />
        )}
      </Container>
    </Box>
  );
}
