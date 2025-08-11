import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
  validateTime,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { grid, paper } from "@mui/material";
const API_BASE = "http://localhost:8547/api/ConsumerApi/v1/Restaurant";
const TOKEN =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6ImFwcGVsbGErYXBpQHJlc2RpYXJ5LmNvbSIsIm5iZiI6MTc1NDQzMDgwNSwiZXhwIjoxNzU0NTE3MjA1LCJpYXQiOjE3NTQ0MzA4MDUsImlzcyI6IlNlbGYiLCJhdWQiOiJodHRwczovL2FwaS5yZXNkaWFyeS5jb20ifQ.g3yLsufdk8Fn2094SB3J3XW-KdBc0DY9a2Jiu_56ud8";

// Booking Method
async function createBooking(restaurantName, bookingData) {
  const formData = new FormData();
  Object.entries(bookingData).forEach(([key, value]) => {
    if (typeof value === "object") {
      Object.entries(value).forEach(([subKey, subVal]) => {
        formData.append(`Customer[${subKey}]`, subVal);
      });
    } else {
      formData.append(key, value);
    }
  });

  const response = await fetch(
    `${API_BASE}/${restaurantName}/BookingWithStripeToken`,
    {
      method: "POST",
      headers: {
        Authorization: TOKEN,
      },
      body: formData,
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to create booking");
  }
  return response.json();
}

// Gett BookingDetails
async function getBooking(restaurantName, bookingreference) {
  const response = await fetch(
    `${API_BASE}/${restaurantName}/Booking/${bookingreference}`,
    {
      headers: { Authorization: TOKEN },
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to fetch booking");
  }
  return response.json();
}

async function updateBooking(restaurantName, bookingreference, updateData) {
  const formData = new FormData();
  Object.entries(updateData).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(
    `${API_BASE}/${restaurantName}/Booking/${bookingreference}`,
    {
      method: "PATCH",
      headers: {
        Authorization: TOKEN,
      },
      body: formData,
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to update booking");
  }
  return response.json();
}

async function cancelBooking(
  restaurantName,
  bookingReference,
  cancellationReasonId
) {
  const formData = new FormData();
  formData.append("micrositeName", restaurantName);
  formData.append("bookingReference", bookingReference);
  formData.append("cancellationReasonId", cancellationReasonId);

  const response = await fetch(
    `${API_BASE}/${restaurantName}/Booking/${bookingReference}/Cancel`,
    {
      method: "POST",
      headers: {
        Authorization: TOKEN,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to cancel booking");
  }
  return response.json();
}

export default function BookingManager() {
  const restaurantName = "TheHungryUnicorn";

  // States for booking creation form
  const [visitDate, setVisitDate] = useState(null);
  const [visitTime, setVisitTime] = useState(null);
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // States for booking lookup/update/cancel
  const [bookingReference, setBookingReference] = useState("");
  const [bookingDetails, setBookingDetails] = useState(null);
  const [updatePartySize, setUpdatePartySize] = useState(1);
  const [cancellationReasonId, setCancellationReasonId] = useState("1");

  // Common UI states
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [validationErrors, setValidationErrors] = useState({
    customerName: "",
    customerEmail: "",
    visitDate: "",
    visitTime: "",
    partySize: "",
  });

  // Validation functions
  function validateName(name) {
    if (!name.trim()) return "Name is required.";
    return "";
  }
  function validateEmail(email) {
    // Simple email regex for demonstration
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) return "Email is required.";
    if (!emailRegex.test(email)) return "Invalid email format.";
    return "";
  }

  function validateVisitDate(date) {
    if (!date) return "Visit date is required";
    return "";
  }
  function validateVisitTime(time) {
    if (!time) return "Visit time is required.";
    return "";
  }

  function validatePartySize(size) {
    if (!size || size < 1 || size > 20)
      return "party size must be between 1 and 20.";
    return "";
  }

  const BookingForm = ({ onSubmit }) => {
    const [FormData, setFormData] = useState({
      name: "",
      email: "",
      phone: "",
      date: "",
      time: "",
      guests: 1,
      notes: "",
    });
  };
  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   setFormData((prev) => ({ ...prev, [name]: value }));
  // };
  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   onSubmit(FormData);
  // };
  // // Change handlers with validation updates
  const handleCustomerNameChange = (e) => {
    const value = e.target.value;
    setCustomerName(value);
    setValidationErrors((prev) => ({
      ...prev,
      customerName: validateName(value),
    }));
  };

  const handleCustomerEmailChange = (e) => {
    const value = e.target.value;
    setCustomerEmail(value);
    setValidationErrors((prev) => ({
      ...prev,
      customerEmail: validateEmail(value),
    }));
  };

  const handleVisitDateChange = (newValue) => {
    setVisitDate(newValue);
    setValidationErrors((prev) => ({
      ...prev,
      visitDate: validateVisitDate(newValue),
    }));
  };

  const handleVisitTimeChange = (newValue) => {
    setVisitTime(newValue);
    setValidationErrors((prev) => ({
      ...prev,
      visitTime: validateVisitTime(newValue),
    }));
  };

  const handlePartySizeChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setPartySize(value);
    setValidationErrors((prev) => ({
      ...prev,
      partySize: validatePartySize(value),
    }));
  };

  // Create booking handler
  async function handleCreateBooking(e) {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (!visitDate || !visitTime) {
      setErrorMsg("Please select visit date and time.");
      setLoading(false);
      return;
    }
    try {
      const bookingData = {
        VisitDate: dayjs(visitDate).format("YYYY-MM-DD"),
        VisitTime: dayjs(visitTime).format("HH:mm:ss"),
        PartySize: partySize,
        ChannelCode: "ONLINE",
        SpecialRequests: specialRequests,
        Customer: {
          FirstName: customerName,
          Email: customerEmail,
        },
      };

      const data = await createBooking(restaurantName, bookingData);
      setSuccessMsg(`Booking confirmed! Reference: ${data.booking_reference}`);
      setBookingReference(data.booking_reference);
      setBookingDetails(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }
  // Fetch booking handler
  async function handleGetBooking() {
    if (!bookingReference) {
      setErrorMsg("Please enter booking reference to fetch.");
      return;
    }
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const data = await getBooking(restaurantName, bookingReference);
      setBookingDetails(data);
      setSuccessMsg("Booking details fetched successfully.");
    } catch (err) {
      setErrorMsg(err.message);
      setBookingDetails(null);
    } finally {
      setLoading(false);
    }
  }
  // Update booking handler (example: updating party size)
  async function handleUpdateBooking() {
    if (!bookingReference) {
      setErrorMsg("Please enter booking reference to update.");
      return;
    }
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const updateData = {
        PartySize: updatePartySize,
      };
      const data = await updateBooking(
        restaurantName,
        bookingReference,
        updateData
      );
      setBookingDetails(data);
      setSuccessMsg("Booking updated successfully.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Cancel booking handler
  async function handleCancelBooking() {
    if (!bookingReference) {
      setErrorMsg("Please enter booking reference to cancel.");
      return;
    }
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await cancelBooking(
        restaurantName,
        bookingReference,
        cancellationReasonId
      );
      setSuccessMsg("Booking canceled successfully.");
      setBookingDetails(null);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
        <Typography variant="h4" gutterBottom>
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

        {/* Create Booking Form */}
        <Box component="form" onSubmit={handleCreateBooking} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Create Booking
          </Typography>

          <DatePicker
            label="Visit Date"
            value={visitDate}
            //onChange={(newValue) => setVisitDate(newValue)}
            onChange={handleVisitDateChange}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                fullWidth
                margin="normal"
                error={!!validationErrors.visitDate}
                helperText={validationErrors.visitDate}
              />
            )}
          />

          <TimePicker
            label="Visit Time"
            value={visitTime}
            //onChange={(newValue) => setVisitTime(newValue)}
            onChange={handleVisitTimeChange}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                fullWidth
                margin="normal"
                error={!!validationErrors.visitTime}
                helperText={validationErrors.visitTime}
              />
            )}
          />

          <TextField
            label="Party Size"
            type="number"
            value={partySize}
            onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
            inputProps={{ min: 1, max: 20 }}
            required
            fullWidth
            margin="normal"
          />

          <TextField
            label="Special Requests"
            multiline
            rows={3}
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            fullWidth
            margin="normal"
          />

          <TextField
            label="Your Name"
            value={customerName}
            onChange={handleCustomerNameChange}
            required
            fullWidth
            margin="normal"
            error={!!validationErrors.customerName}
            helperText={validationErrors.customerName}
          />

          <TextField
            label="Email"
            value={customerEmail}
            onChange={handleCustomerEmailChange}
            required
            fullWidth
            margin="normal"
            error={!!validationErrors.customerEmail}
            helperText={validationErrors.customerEmail}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Book Table"}
          </Button>
        </Box>

        {/* Booking Reference Input for other operations */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Manage Booking
          </Typography>
          <TextField
            label="Booking Reference"
            value={bookingReference}
            onChange={(e) => setBookingReference(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button
            variant="outlined"
            onClick={handleGetBooking}
            disabled={loading}
            sx={{ mr: 1, mb: 1 }}
          >
            Fetch Booking
          </Button>
          <Button
            variant="outlined"
            onClick={handleUpdateBooking}
            disabled={loading}
            sx={{ mr: 1, mb: 1 }}
          >
            Update Party Size to
          </Button>
          <TextField
            type="number"
            value={updatePartySize}
            onChange={(e) => setUpdatePartySize(parseInt(e.target.value, 10))}
            inputProps={{ min: 1, max: 20 }}
            size="small"
            sx={{ width: 80, mr: 2 }}
          />
          <Button
            variant="outlined"
            onClick={handleCancelBooking}
            disabled={loading}
            sx={{ mb: 1 }}
          >
            Cancel Booking
          </Button>
        </Box>

        {/* Show booking details */}
        {bookingDetails && (
          <Box sx={{ mt: 3, p: 2, border: "1px solid #ccc", borderRadius: 1 }}>
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

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">
                <strong>Customer Information</strong>
              </Typography>
              <Typography>
                <strong>Name:</strong>{" "}
                {bookingDetails.customer?.first_name || "—"}{" "}
                {bookingDetails.customer?.surname || ""}
              </Typography>
              <Typography>
                <strong>Email:</strong> {bookingDetails.customer?.email || "—"}
              </Typography>
              <Typography>
                <strong>Mobile:</strong>{" "}
                {bookingDetails.customer?.mobile || "—"}
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Created:{" "}
                {dayjs(bookingDetails.created_at).format("MMM D, YYYY h:mm A")}
                {" | "}
                Updated:{" "}
                {dayjs(bookingDetails.updated_at).format("MMM D, YYYY h:mm A")}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
}
