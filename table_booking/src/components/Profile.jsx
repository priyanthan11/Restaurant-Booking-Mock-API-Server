// src/components/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

// ---- Restaurant API (same base + token you’ve used) ----
const API_BASE = "http://localhost:8547/api/ConsumerApi/v1/Restaurant";
const RESTAURANT_TOKEN =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6ImFwcGVsbGErYXBpQHJlc2RpYXJ5LmNvbSIsIm5iZiI6MTc1NDQzMDgwNSwiZXhwIjoxNzU0NTE3MjA1LCJpYXQiOjE3NTQ0MzA4MDUsImlzcyI6IlNlbGYiLCJhdWQiOiJodHRwczovL2FwaS5yZXNkaWFyeS5jb20ifQ.g3yLsufdk8Fn2094SB3J3XW-KdBc0DY9a2Jiu_56ud8";

// ----- API helpers -----
async function getBooking(restaurantName, reference) {
  const res = await fetch(
    `${API_BASE}/${restaurantName}/Booking/${reference}`,
    { headers: { Authorization: RESTAURANT_TOKEN } }
  );
  if (!res.ok) {
    let msg = "Failed to fetch booking";
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function updateBooking(restaurantName, reference, updateData) {
  const formData = new FormData();
  Object.entries(updateData).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") formData.append(k, v);
  });
  const res = await fetch(
    `${API_BASE}/${restaurantName}/Booking/${reference}`,
    {
      method: "PATCH",
      headers: { Authorization: RESTAURANT_TOKEN },
      body: formData,
    }
  );
  if (!res.ok) {
    let msg = "Failed to update booking";
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function cancelBooking(restaurantName, reference, cancellationReasonId) {
  const formData = new FormData();
  formData.append("micrositeName", restaurantName);
  formData.append("bookingReference", reference);
  formData.append("cancellationReasonId", String(cancellationReasonId));
  const res = await fetch(
    `${API_BASE}/${restaurantName}/Booking/${reference}/Cancel`,
    {
      method: "POST",
      headers: { Authorization: RESTAURANT_TOKEN },
      body: formData,
    }
  );
  if (!res.ok) {
    let msg = "Failed to cancel booking";
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function searchAvailability(restaurantName, visitDate, partySize) {
  const body = new URLSearchParams();
  body.append("VisitDate", visitDate); // YYYY-MM-DD
  body.append("PartySize", String(partySize));
  body.append("ChannelCode", "ONLINE");
  const res = await fetch(`${API_BASE}/${restaurantName}/AvailabilitySearch`, {
    method: "POST",
    headers: {
      Authorization: RESTAURANT_TOKEN,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    let msg = "Failed to check availability";
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ----- Profile Component -----
export default function Profile({ authToken }) {
  const restaurantName = "TheHungryUnicorn";

  // local “recent bookings” (saved when user creates bookings in the app)
  const [recent, setRecent] = useState(() => {
    try {
      const raw = localStorage.getItem("myBookings");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // server fetch/manage state
  const [refInput, setRefInput] = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // modify state
  const [mDate, setMDate] = useState(null);
  const [mTime, setMTime] = useState(null);
  const [mParty, setMParty] = useState(1);
  const [mRequests, setMRequests] = useState("");

  // cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(1);

  // availability for modify step
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsErr, setSlotsErr] = useState("");

  // Keep localStorage synced if we update/cancel something that’s also in recent list
  const upsertRecent = (b) => {
    setRecent((prev) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      const idx = copy.findIndex(
        (x) => x.booking_reference === b.booking_reference
      );
      if (idx >= 0) copy[idx] = { ...copy[idx], ...b };
      else copy.unshift(b);
      try {
        localStorage.setItem("myBookings", JSON.stringify(copy.slice(0, 20)));
      } catch {}
      return copy.slice(0, 20);
    });
  };

  const removeFromRecent = (reference) => {
    setRecent((prev) => {
      const filtered = (prev || []).filter(
        (x) => x.booking_reference !== reference
      );
      try {
        localStorage.setItem("myBookings", JSON.stringify(filtered));
      } catch {}
      return filtered;
    });
  };

  const loadFromReference = async (reference) => {
    setOkMsg("");
    setErrMsg("");
    setLoading(true);
    try {
      const data = await getBooking(restaurantName, reference.trim());
      setBooking(data);
      // prefill modify controls
      setMDate(dayjs(data.visit_date));
      setMTime(dayjs(data.visit_time, "HH:mm:ss"));
      setMParty(data.party_size || 1);
      setMRequests(data.special_requests || "");
      upsertRecent(data); // keep local list aligned
      setOkMsg("Booking loaded.");
    } catch (e) {
      setBooking(null);
      setErrMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = () => {
    if (!refInput.trim()) {
      setErrMsg("Enter a booking reference first.");
      return;
    }
    loadFromReference(refInput);
  };

  const handleCheckSlots = async () => {
    setSlotsErr("");
    setSlots([]);
    if (!mDate || !mParty) {
      setSlotsErr("Pick a date and party size first.");
      return;
    }
    setSlotsLoading(true);
    try {
      const data = await searchAvailability(
        restaurantName,
        dayjs(mDate).format("YYYY-MM-DD"),
        mParty
      );
      setSlots(data.available_slots || []);
    } catch (e) {
      setSlotsErr(e.message);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!booking?.booking_reference) return;
    setOkMsg("");
    setErrMsg("");
    setLoading(true);
    try {
      const payload = {
        VisitDate: mDate ? dayjs(mDate).format("YYYY-MM-DD") : undefined,
        VisitTime: mTime ? dayjs(mTime).format("HH:mm:ss") : undefined,
        PartySize: mParty ?? undefined,
        SpecialRequests: mRequests ?? undefined,
      };
      const data = await updateBooking(
        restaurantName,
        booking.booking_reference,
        payload
      );
      // merge response fields back to our view
      const merged = { ...booking, ...data };
      setBooking(merged);
      upsertRecent(merged);
      setOkMsg("Booking updated.");
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!booking?.booking_reference) return;
    setCancelOpen(false);
    setOkMsg("");
    setErrMsg("");
    setLoading(true);
    try {
      await cancelBooking(
        restaurantName,
        booking.booking_reference,
        cancelReason
      );
      setOkMsg("Booking cancelled.");
      removeFromRecent(booking.booking_reference);
      setBooking(null);
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ maxWidth: 1100, mx: "auto", py: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>
          My Profile
        </Typography>

        {okMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {okMsg}
          </Alert>
        )}
        {errMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errMsg}
          </Alert>
        )}

        {/* Recent Bookings */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Recent Bookings
          </Typography>

          {recent.length === 0 ? (
            <Typography color="text.secondary">
              No saved bookings yet. Create a booking and it’ll appear here.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {recent.map((b) => (
                <Grid key={b.booking_reference} item xs={12} md={6} lg={4}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                      {b.booking_reference}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.25 }}>
                      {b.restaurant} —{" "}
                      {dayjs(b.visit_date).format("MMM D, YYYY")}{" "}
                      {dayjs(b.visit_time, "HH:mm:ss").format("h:mm A")}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Party: {b.party_size}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => loadFromReference(b.booking_reference)}
                        >
                          View / Manage
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          variant="text"
                          color="error"
                          fullWidth
                          onClick={() => {
                            setBooking(b);
                            setCancelOpen(true);
                          }}
                        >
                          Cancel
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* Fetch by Reference */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Find Booking by Reference
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Booking Reference"
                fullWidth
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                onClick={handleFetch}
                disabled={loading || !refInput.trim()}
                fullWidth
              >
                {loading ? <CircularProgress size={22} /> : "Fetch Booking"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Selected Booking Detail + Modify */}
        {booking && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Booking Details
            </Typography>
            <Typography>
              <strong>Reference:</strong> {booking.booking_reference}
            </Typography>
            <Typography>
              <strong>Restaurant:</strong> {booking.restaurant}
            </Typography>
            <Typography>
              <strong>Date & Time:</strong>{" "}
              {dayjs(booking.visit_date).format("MMMM D, YYYY")} at{" "}
              {dayjs(booking.visit_time, "HH:mm:ss").format("h:mm A")}
            </Typography>
            <Typography>
              <strong>Party Size:</strong> {booking.party_size}
            </Typography>
            <Typography sx={{ mb: 2 }}>
              <strong>Status:</strong> {booking.status}
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Modify Booking
            </Typography>

            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="New Date"
                  value={mDate}
                  onChange={(v) => setMDate(v)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TimePicker
                  label="New Time"
                  value={mTime}
                  onChange={(v) => setMTime(v)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="New Party Size"
                  type="number"
                  value={mParty}
                  onChange={(e) =>
                    setMParty(parseInt(e.target.value || "0", 10))
                  }
                  inputProps={{ min: 1, max: 20 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="outlined"
                  onClick={handleCheckSlots}
                  disabled={slotsLoading}
                  fullWidth
                >
                  {slotsLoading ? "Checking..." : "Check Slots"}
                </Button>
              </Grid>

              <Grid item xs={12}>
                {slotsErr && <Alert severity="warning">{slotsErr}</Alert>}
                {slots.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mb: 1 }}
                    >
                      Select a time slot:
                    </Typography>
                    <ToggleButtonGroup
                      value={mTime ? dayjs(mTime).format("HH:mm:ss") : ""}
                      exclusive
                      onChange={(_, val) => {
                        if (val) setMTime(dayjs(val, "HH:mm:ss"));
                      }}
                      sx={{ flexWrap: "wrap", gap: 1 }}
                    >
                      {slots.map((s) => (
                        <ToggleButton
                          key={s.time}
                          value={s.time}
                          disabled={!s.available}
                          sx={{ textTransform: "none", px: 1.25, py: 0.5 }}
                        >
                          {dayjs(s.time, "HH:mm:ss").format("h:mm A")}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Special Requests"
                  value={mRequests}
                  onChange={(e) => setMRequests(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Button
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={22} /> : "Save Changes"}
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setCancelOpen(true)}
                  fullWidth
                >
                  Cancel Booking
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Cancel Dialog */}
        <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)}>
          <DialogTitle>Cancel booking?</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              This cannot be undone. Choose a cancellation reason (1–5).
            </Typography>
            <TextField
              label="Reason ID"
              type="number"
              value={cancelReason}
              onChange={(e) =>
                setCancelReason(parseInt(e.target.value || "1", 10))
              }
              inputProps={{ min: 1, max: 5 }}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelOpen(false)}>No</Button>
            <Button color="error" onClick={handleConfirmCancel}>
              Yes, cancel it
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
