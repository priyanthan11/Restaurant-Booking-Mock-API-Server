import React, { useMemo, useState } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
} from "@mui/material";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const API_BASE = "http://localhost:8547/api/ConsumerApi/v1/Restaurant";
const TOKEN =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6ImFwcGVsbGErYXBpQHJlc2RpYXJ5LmNvbSIsIm5iZiI6MTc1NDQzMDgwNSwiZXhwIjoxNzU0NTE3MjA1LCJpYXQiOjE3NTQ0MzA4MDUsImlzcyI6IlNlbGYiLCJhdWQiOiJodHRwczovL2FwaS5yZXNkaWFyeS5jb20ifQ.g3yLsufdk8Fn2094SB3J3XW-KdBc0DY9a2Jiu_56ud8";

// ---------------- helpers: static info panel data ----------------
const OPENING_HOURS = [
  { label: "Lunch", hours: "12:00 – 14:00" },
  { label: "Dinner", hours: "19:00 – 21:00" },
];

const CANCELLATION_POLICY = [
  "Free cancellation up to 24 hours before your booking time.",
  "Within 24 hours: please contact the restaurant by phone.",
  "No-shows may affect future booking priority.",
];

const CANCELLATION_REASONS = [
  { id: 1, text: "Customer Request" },
  { id: 2, text: "Restaurant Closure" },
  { id: 3, text: "Weather" },
  { id: 4, text: "Emergency" },
  { id: 5, text: "No Show" },
];

// ---------------- API helpers (unchanged protocol) ----------------
async function createBooking(restaurantName, bookingData) {
  const formData = new FormData();
  Object.entries(bookingData).forEach(([key, value]) => {
    if (typeof value === "object" && value !== null) {
      Object.entries(value).forEach(([subKey, subVal]) => {
        formData.append(`Customer[${subKey}]`, subVal);
      });
    } else {
      formData.append(key, value);
    }
  });

  const response = await fetch(
    `${API_BASE}/${restaurantName}/BookingWithStripeToken`,
    { method: "POST", headers: { Authorization: TOKEN }, body: formData }
  );
  if (!response.ok) {
    let msg = "Failed to create booking";
    try {
      const err = await response.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return response.json();
}

async function getBooking(restaurantName, reference) {
  const res = await fetch(
    `${API_BASE}/${restaurantName}/Booking/${reference}`,
    { headers: { Authorization: TOKEN } }
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
  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  const res = await fetch(
    `${API_BASE}/${restaurantName}/Booking/${reference}`,
    { method: "PATCH", headers: { Authorization: TOKEN }, body: formData }
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
    { method: "POST", headers: { Authorization: TOKEN }, body: formData }
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

// README: AvailabilitySearch = POST form-urlencoded with VisitDate, PartySize, ChannelCode
async function searchAvailability(restaurantName, visitDate, partySize) {
  const body = new URLSearchParams();
  body.append("VisitDate", visitDate); // YYYY-MM-DD
  body.append("PartySize", String(partySize));
  body.append("ChannelCode", "ONLINE");

  const res = await fetch(`${API_BASE}/${restaurantName}/AvailabilitySearch`, {
    method: "POST",
    headers: {
      Authorization: TOKEN,
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

// ---------------- Component ----------------
export default function BookingManager() {
  const restaurantName = "TheHungryUnicorn";

  // booking form state
  const [visitDate, setVisitDate] = useState(null);
  const [visitTime, setVisitTime] = useState(null);
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // availability state
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]); // [{time, available, max_party_size,...}]

  // booking management state
  const [bookingReference, setBookingReference] = useState("");
  const [bookingDetails, setBookingDetails] = useState(null);

  // modify state
  const [updateDate, setUpdateDate] = useState(null);
  const [updateTime, setUpdateTime] = useState(null);
  const [updatePartySize, setUpdatePartySize] = useState(1);
  const [updateRequests, setUpdateRequests] = useState("");

  // cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReasonId, setCancellationReasonId] = useState("1");

  // UI
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // validation
  const errors = useMemo(() => {
    const e = {};
    if (!customerName.trim()) e.customerName = "Name is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail.trim()) e.customerEmail = "Email is required.";
    else if (!emailRegex.test(customerEmail))
      e.customerEmail = "Invalid email format.";
    if (!visitDate) e.visitDate = "Visit date is required.";
    if (!visitTime) e.visitTime = "Visit time is required.";
    if (!partySize || partySize < 1 || partySize > 20)
      e.partySize = "Party size must be between 1 and 20.";
    return e;
  }, [customerName, customerEmail, visitDate, visitTime, partySize]);

  const hasErrors = Object.keys(errors).length > 0;

  // actions
  async function handleCheckAvailability() {
    setAvailabilityError("");
    setAvailableSlots([]);
    if (!visitDate || !partySize) {
      setAvailabilityError("Pick a date and party size first.");
      return;
    }
    setAvailabilityLoading(true);
    try {
      const payloadDate = dayjs(visitDate).format("YYYY-MM-DD");
      const data = await searchAvailability(
        restaurantName,
        payloadDate,
        partySize
      );
      setAvailableSlots(data.available_slots || []);
    } catch (err) {
      setAvailabilityError(err.message);
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function handleCreateBooking(e) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    if (hasErrors) {
      setErrorMsg("Please fix the errors before booking.");
      return;
    }
    setLoading(true);
    try {
      const bookingData = {
        VisitDate: dayjs(visitDate).format("YYYY-MM-DD"),
        VisitTime: dayjs(visitTime).format("HH:mm:ss"),
        PartySize: partySize,
        ChannelCode: "ONLINE",
        SpecialRequests: specialRequests,
        Customer: { FirstName: customerName, Email: customerEmail },
      };
      const data = await createBooking(restaurantName, bookingData);
      setSuccessMsg(`Booking confirmed! Reference: ${data.booking_reference}`);
      setBookingReference(data.booking_reference);
      setBookingDetails(data);

      try {
        const list = JSON.parse(localStorage.getItem("myBookings") || "[]");
        list.unshift(data); // newest first
        localStorage.setItem("myBookings", JSON.stringify(list.slice(0, 20)));
      } catch {}

      // prefill modify section
      setUpdateDate(dayjs(data.visit_date));
      setUpdateTime(dayjs(data.visit_time, "HH:mm:ss"));
      setUpdatePartySize(data.party_size ?? partySize);
      setUpdateRequests(data.special_requests ?? specialRequests);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGetBooking() {
    setSuccessMsg("");
    setErrorMsg("");
    if (!bookingReference.trim()) {
      setErrorMsg("Please enter booking reference to fetch.");
      return;
    }
    setLoading(true);
    try {
      const data = await getBooking(restaurantName, bookingReference.trim());
      setBookingDetails(data);

      // prefill modify section
      setUpdateDate(dayjs(data.visit_date));
      setUpdateTime(dayjs(data.visit_time, "HH:mm:ss"));
      setUpdatePartySize(data.party_size || 1);
      setUpdateRequests(data.special_requests || "");
      setSuccessMsg("Booking details fetched successfully.");
    } catch (err) {
      setErrorMsg(err.message);
      setBookingDetails(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateBooking() {
    setSuccessMsg("");
    setErrorMsg("");
    if (!bookingReference.trim()) {
      setErrorMsg("Please enter booking reference to update.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        VisitDate: updateDate
          ? dayjs(updateDate).format("YYYY-MM-DD")
          : undefined,
        VisitTime: updateTime
          ? dayjs(updateTime).format("HH:mm:ss")
          : undefined,
        PartySize: updatePartySize ?? undefined,
        SpecialRequests: updateRequests ?? undefined,
      };
      const data = await updateBooking(
        restaurantName,
        bookingReference.trim(),
        payload
      );
      setBookingDetails((prev) => ({ ...(prev || {}), ...data }));
      setSuccessMsg("Booking updated successfully.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmCancelBooking() {
    setSuccessMsg("");
    setErrorMsg("");
    setCancelDialogOpen(false);
    if (!bookingReference.trim()) {
      setErrorMsg("Please enter booking reference to cancel.");
      return;
    }
    setLoading(true);
    try {
      await cancelBooking(
        restaurantName,
        bookingReference.trim(),
        cancellationReasonId
      );
      setSuccessMsg("Booking cancelled successfully.");
      setBookingDetails(null);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // UI
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ maxWidth: 980, mx: "auto", p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          Restaurant Booking Manager
        </Typography>

        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMsg}
          </Alert>
        )}
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Create / Search */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Create Booking
          </Typography>

          <Grid
            container
            spacing={2}
            component="form"
            onSubmit={handleCreateBooking}
          >
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Visit Date"
                value={visitDate}
                onChange={(v) => setVisitDate(v)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.visitDate,
                    helperText: errors.visitDate || " ",
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Party Size"
                type="number"
                value={partySize}
                onChange={(e) =>
                  setPartySize(parseInt(e.target.value || "0", 10))
                }
                inputProps={{ min: 1, max: 20 }}
                fullWidth
                required
                error={!!errors.partySize}
                helperText={errors.partySize || " "}
              />
            </Grid>

            <Grid item xs={12} md={4} display="flex" alignItems="flex-end">
              <Button
                variant="outlined"
                onClick={handleCheckAvailability}
                disabled={availabilityLoading}
                fullWidth
              >
                {availabilityLoading ? "Checking..." : "Check Availability"}
              </Button>
            </Grid>

            {/* Slots */}
            <Grid item xs={12}>
              {availabilityError && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {availabilityError}
                </Alert>
              )}

              {availableSlots.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Select a time slot:
                  </Typography>
                  <ToggleButtonGroup
                    value={visitTime ? dayjs(visitTime).format("HH:mm:ss") : ""}
                    exclusive
                    onChange={(_, val) => {
                      if (val) setVisitTime(dayjs(val, "HH:mm:ss"));
                    }}
                    aria-label="available time slots"
                    sx={{ flexWrap: "wrap", gap: 1 }}
                  >
                    {availableSlots.map((s) => {
                      const isDisabled = !s.available;
                      const val = s.time; // "HH:mm:ss"
                      return (
                        <ToggleButton
                          key={val}
                          value={val}
                          disabled={isDisabled}
                          sx={{ textTransform: "none", px: 1.5, py: 0.75 }}
                        >
                          {dayjs(val, "HH:mm:ss").format("h:mm A")}
                        </ToggleButton>
                      );
                    })}
                  </ToggleButtonGroup>
                </>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <TimePicker
                label="Visit Time (optional if picked a slot)"
                value={visitTime}
                onChange={(v) => setVisitTime(v)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.visitTime,
                    helperText: errors.visitTime || " ",
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Special Requests"
                multiline
                rows={3}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Your Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                fullWidth
                error={!!errors.customerName}
                helperText={errors.customerName || " "}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                fullWidth
                error={!!errors.customerEmail}
                helperText={errors.customerEmail || " "}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
              >
                {loading ? <CircularProgress size={22} /> : "Book Table"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Information Panel */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Restaurant Info
          </Typography>

          <Grid container spacing={2}>
            {/* Opening hours */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Opening Hours
              </Typography>
              {OPENING_HOURS.map((h) => (
                <Typography key={h.label} variant="body2">
                  <strong>{h.label}:</strong> {h.hours}
                </Typography>
              ))}
            </Grid>

            {/* Capacity & availability */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Capacity & Availability
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Party size:</strong> {partySize}
              </Typography>

              {availableSlots.length > 0 ? (
                <>
                  <Typography variant="body2">
                    <strong>Slots available:</strong>{" "}
                    {availableSlots.filter((s) => s.available).length} /{" "}
                    {availableSlots.length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Max table size (today):</strong>{" "}
                    {(() => {
                      const sizes = availableSlots
                        .map((s) => s.max_party_size)
                        .filter((n) => Number.isFinite(n));
                      return sizes.length ? Math.max(...sizes) : "—";
                    })()}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Pick a date and click <em>Check Availability</em> to see
                  today’s slots.
                </Typography>
              )}
            </Grid>

            {/* Cancellation policy */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Cancellation Policy
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                {CANCELLATION_POLICY.map((line, i) => (
                  <li key={i}>
                    <Typography variant="body2">{line}</Typography>
                  </li>
                ))}
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                Valid cancellation reasons:
              </Typography>
              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}
              >
                {CANCELLATION_REASONS.map((r) => (
                  <Box
                    key={r.id}
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: "action.selected",
                      fontSize: 12,
                    }}
                    title={`ID ${r.id}`}
                  >
                    {r.id}. {r.text}
                  </Box>
                ))}
              </Box>
            </Grid>

            {/* Special requests pointer */}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Need a high chair, wheelchair access, or a window seat? Use the{" "}
                <strong>Special Requests</strong> box in the form above and
                we’ll do our best.
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Manage Section */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Manage Booking
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Booking Reference"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                onClick={handleGetBooking}
                disabled={loading}
                fullWidth
              >
                Fetch Booking
              </Button>
            </Grid>
          </Grid>

          {bookingDetails && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Modify Booking
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="New Date"
                    value={updateDate}
                    onChange={(v) => setUpdateDate(v)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TimePicker
                    label="New Time"
                    value={updateTime}
                    onChange={(v) => setUpdateTime(v)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="New Party Size"
                    type="number"
                    value={updatePartySize}
                    onChange={(e) =>
                      setUpdatePartySize(parseInt(e.target.value || "0", 10))
                    }
                    inputProps={{ min: 1, max: 20 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3} display="flex" alignItems="stretch">
                  <Button
                    variant="contained"
                    onClick={handleUpdateBooking}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={22} /> : "Save Changes"}
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Update Special Requests"
                    multiline
                    rows={2}
                    value={updateRequests}
                    onChange={(e) => setUpdateRequests(e.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Cancellation Reason ID (1–5)"
                    type="number"
                    value={cancellationReasonId}
                    onChange={(e) => setCancellationReasonId(e.target.value)}
                    inputProps={{ min: 1, max: 5 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={8} display="flex" alignItems="stretch">
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setCancelDialogOpen(true)}
                    fullWidth
                  >
                    Cancel Booking
                  </Button>
                </Grid>
              </Grid>
            </>
          )}
        </Paper>

        {/* Booking Details */}
        {bookingDetails && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Booking Details
            </Typography>
            <Typography>
              <strong>Reference:</strong> {bookingDetails.booking_reference}
            </Typography>
            <Typography>
              <strong>Restaurant:</strong> {bookingDetails.restaurant}
            </Typography>
            <Typography>
              <strong>Date & Time:</strong>{" "}
              {dayjs(bookingDetails.visit_date).format("MMMM D, YYYY")} at{" "}
              {dayjs(bookingDetails.visit_time, "HH:mm:ss").format("h:mm A")}
            </Typography>
            <Typography>
              <strong>Party Size:</strong> {bookingDetails.party_size}
            </Typography>
            <Typography>
              <strong>Special Requests:</strong>{" "}
              {bookingDetails.special_requests || "—"}
            </Typography>
            <Typography>
              <strong>Status:</strong> {bookingDetails.status}
            </Typography>
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="subtitle1">
                <strong>Customer</strong>
              </Typography>
              <Typography>
                {bookingDetails.customer?.first_name || "—"}{" "}
                {bookingDetails.customer?.surname || ""}
              </Typography>
              <Typography>{bookingDetails.customer?.email || "—"}</Typography>
              <Typography>{bookingDetails.customer?.mobile || "—"}</Typography>
            </Box>
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Created:{" "}
                {dayjs(bookingDetails.created_at).format("MMM D, YYYY h:mm A")}
                {"  |  "}
                Updated:{" "}
                {dayjs(bookingDetails.updated_at).format("MMM D, YYYY h:mm A")}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Cancel confirmation dialog */}
        <Dialog
          open={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
        >
          <DialogTitle>Cancel booking?</DialogTitle>
          <DialogContent>
            This action cannot be undone. Are you sure you want to cancel this
            booking ({bookingReference || "no reference set"})?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>No</Button>
            <Button color="error" onClick={confirmCancelBooking}>
              Yes, cancel it
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
