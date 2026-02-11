"use client";

import * as React from "react";
import { format, addDays, parse } from "date-fns";
import type { WidgetConfig } from "./types";
import { useWidget } from "./use-widget";

// ─────────────────────────────────────────────────────────────────────────────
// Utility: generate date options for the next N days
// ─────────────────────────────────────────────────────────────────────────────

function getDateOptions(days: number): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = addDays(today, i);
    options.push({
      value: format(d, "yyyy-MM-dd"),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, MMM d"),
    });
  }
  return options;
}

function formatTimeDisplay(time: string): string {
  const d = parse(time, "HH:mm", new Date());
  return format(d, "h:mm a");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export interface BookingWidgetProps {
  config: WidgetConfig;
}

export function BookingWidget({ config }: BookingWidgetProps) {
  const {
    step,
    goToStep,
    loading,
    error,
    slots,
    restaurantName,
    maxPartySize,
    booking,
    form,
    updateForm,
    fetchAvailability,
    submitBooking,
    reset,
  } = useWidget(config);

  const primaryColor = config.primaryColor ?? "#1e293b";
  const dateOptions = React.useMemo(() => getDateOptions(30), []);

  // ── Step 1: Date + Party Size ────────────────────────────────────────────

  const handleDateSubmit = React.useCallback(() => {
    if (!form.date || !form.partySize) return;
    fetchAvailability(form.date, form.partySize).then(() => {
      goToStep("time");
    });
  }, [form.date, form.partySize, fetchAvailability, goToStep]);

  // ── Step 2: Time ─────────────────────────────────────────────────────────

  const handleTimeSelect = React.useCallback(
    (time: string) => {
      updateForm({ time });
      goToStep("details");
    },
    [updateForm, goToStep],
  );

  // ── Step 3: Details ──────────────────────────────────────────────────────

  const handleDetailsSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name.trim()) return;
      if (!form.email && !form.phone) return;
      submitBooking();
    },
    [form.name, form.email, form.phone, submitBooking],
  );

  return (
    <div
      style={{ "--widget-primary": primaryColor } as React.CSSProperties}
      className="bw-root"
    >
      <style>{widgetStyles}</style>

      {/* Header */}
      <div className="bw-header">
        {restaurantName && (
          <div className="bw-restaurant-name">{restaurantName}</div>
        )}
        <div className="bw-title">Reserve a Table</div>
        {step !== "date" && step !== "confirm" && (
          <button
            type="button"
            className="bw-back"
            onClick={() => goToStep(step === "details" ? "time" : "date")}
          >
            &larr; Back
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && <div className="bw-error">{error}</div>}

      {/* Step: Date + Party Size */}
      {step === "date" && (
        <div className="bw-step">
          <label className="bw-label">Date</label>
          <select
            className="bw-select"
            value={form.date}
            onChange={(e) => updateForm({ date: e.target.value })}
          >
            <option value="">Select a date</option>
            {dateOptions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <label className="bw-label">Party Size</label>
          <div className="bw-party-row">
            <button
              type="button"
              className="bw-party-btn"
              disabled={form.partySize <= 1}
              onClick={() =>
                updateForm({ partySize: Math.max(1, form.partySize - 1) })
              }
            >
              -
            </button>
            <span className="bw-party-count">
              {form.partySize} {form.partySize === 1 ? "guest" : "guests"}
            </span>
            <button
              type="button"
              className="bw-party-btn"
              disabled={form.partySize >= maxPartySize}
              onClick={() =>
                updateForm({
                  partySize: Math.min(maxPartySize, form.partySize + 1),
                })
              }
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="bw-primary-btn"
            disabled={!form.date || loading}
            onClick={handleDateSubmit}
          >
            {loading ? "Checking availability..." : "Find a Table"}
          </button>
        </div>
      )}

      {/* Step: Time */}
      {step === "time" && (
        <div className="bw-step">
          <div className="bw-subtitle">
            {form.date &&
              format(parse(form.date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d")}{" "}
            &middot; {form.partySize}{" "}
            {form.partySize === 1 ? "guest" : "guests"}
          </div>
          {loading ? (
            <div className="bw-loading">Loading times...</div>
          ) : slots.length === 0 ? (
            <div className="bw-empty">
              No available times. Try another date.
              <button
                type="button"
                className="bw-link"
                onClick={() => goToStep("date")}
              >
                Change date
              </button>
            </div>
          ) : (
            <div className="bw-time-grid">
              {slots.map((time) => (
                <button
                  key={time}
                  type="button"
                  className="bw-time-btn"
                  onClick={() => handleTimeSelect(time)}
                >
                  {formatTimeDisplay(time)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Details */}
      {step === "details" && (
        <form className="bw-step" onSubmit={handleDetailsSubmit}>
          <div className="bw-subtitle">
            {form.date &&
              format(parse(form.date, "yyyy-MM-dd", new Date()), "EEE, MMM d")}{" "}
            at {formatTimeDisplay(form.time)} &middot; {form.partySize}{" "}
            {form.partySize === 1 ? "guest" : "guests"}
          </div>

          <label className="bw-label">
            Name <span className="bw-required">*</span>
          </label>
          <input
            className="bw-input"
            type="text"
            required
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
          />

          <label className="bw-label">Email</label>
          <input
            className="bw-input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => updateForm({ email: e.target.value })}
          />

          <label className="bw-label">Phone</label>
          <input
            className="bw-input"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={form.phone}
            onChange={(e) => updateForm({ phone: e.target.value })}
          />

          {!form.email && !form.phone && (
            <p className="bw-hint">Email or phone is required</p>
          )}

          <label className="bw-label">Special Requests</label>
          <textarea
            className="bw-textarea"
            placeholder="Allergies, celebrations, seating preference..."
            rows={3}
            value={form.specialRequests}
            onChange={(e) => updateForm({ specialRequests: e.target.value })}
          />

          <button
            type="submit"
            className="bw-primary-btn"
            disabled={
              loading ||
              !form.name.trim() ||
              (!form.email && !form.phone)
            }
          >
            {loading ? "Booking..." : "Complete Reservation"}
          </button>
        </form>
      )}

      {/* Step: Confirmation */}
      {step === "confirm" && booking && (
        <div className="bw-step bw-confirm">
          <div className="bw-check-icon">&#10003;</div>
          <div className="bw-confirm-title">Booking Confirmed!</div>
          <div className="bw-reference">Ref: {booking.reference}</div>

          <div className="bw-confirm-details">
            <div>
              <strong>{booking.restaurantName}</strong>
            </div>
            <div>
              {format(
                parse(booking.date, "yyyy-MM-dd", new Date()),
                "EEEE, MMMM d, yyyy",
              )}
            </div>
            <div>
              {formatTimeDisplay(booking.time)} &middot; {booking.partySize}{" "}
              {booking.partySize === 1 ? "guest" : "guests"}
            </div>
          </div>

          {booking.confirmationMessage && (
            <div className="bw-custom-msg">{booking.confirmationMessage}</div>
          )}

          {form.email && (
            <p className="bw-hint">
              A confirmation has been sent to {form.email}
            </p>
          )}

          <button
            type="button"
            className="bw-secondary-btn"
            onClick={reset}
          >
            Make Another Reservation
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="bw-footer">Powered by Bites</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoped styles (inline to avoid external CSS dependency)
// ─────────────────────────────────────────────────────────────────────────────

const widgetStyles = `
.bw-root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 420px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06);
  overflow: hidden;
  color: #1e293b;
  line-height: 1.5;
}
.bw-header {
  padding: 20px 24px 12px;
  position: relative;
}
.bw-restaurant-name {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 4px;
}
.bw-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--widget-primary, #1e293b);
}
.bw-back {
  position: absolute;
  top: 20px;
  right: 24px;
  background: none;
  border: none;
  color: var(--widget-primary, #1e293b);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}
.bw-back:hover { opacity: 0.7; }
.bw-step {
  padding: 8px 24px 24px;
}
.bw-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
  margin-top: 16px;
}
.bw-label:first-child { margin-top: 0; }
.bw-required { color: #ef4444; }
.bw-select,
.bw-input,
.bw-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
  color: #1e293b;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.bw-select:focus,
.bw-input:focus,
.bw-textarea:focus {
  border-color: var(--widget-primary, #1e293b);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--widget-primary, #1e293b) 15%, transparent);
}
.bw-textarea { resize: vertical; }
.bw-party-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}
.bw-party-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bw-party-btn:hover:not(:disabled) { background: #e2e8f0; }
.bw-party-btn:disabled { opacity: 0.4; cursor: default; }
.bw-party-count {
  font-size: 16px;
  font-weight: 500;
  min-width: 80px;
  text-align: center;
}
.bw-primary-btn {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background: var(--widget-primary, #1e293b);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.bw-primary-btn:hover:not(:disabled) { opacity: 0.9; }
.bw-primary-btn:disabled { opacity: 0.5; cursor: default; }
.bw-secondary-btn {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: transparent;
  color: var(--widget-primary, #1e293b);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.bw-secondary-btn:hover { background: #f8fafc; }
.bw-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
}
.bw-time-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.bw-time-btn {
  padding: 10px 4px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: var(--widget-primary, #1e293b);
  transition: all 0.15s;
}
.bw-time-btn:hover {
  background: var(--widget-primary, #1e293b);
  color: #fff;
  border-color: var(--widget-primary, #1e293b);
}
.bw-loading,
.bw-empty {
  text-align: center;
  padding: 32px 0;
  color: #64748b;
  font-size: 14px;
}
.bw-link {
  display: block;
  margin-top: 8px;
  color: var(--widget-primary, #1e293b);
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
}
.bw-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
  margin-bottom: 0;
}
.bw-error {
  margin: 0 24px;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
}
.bw-confirm {
  text-align: center;
  padding-top: 24px;
}
.bw-check-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: #ecfdf5;
  color: #059669;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
}
.bw-confirm-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--widget-primary, #1e293b);
  margin-bottom: 4px;
}
.bw-reference {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 20px;
  font-family: monospace;
}
.bw-confirm-details {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.7;
}
.bw-custom-msg {
  font-size: 13px;
  color: #475569;
  font-style: italic;
  margin-bottom: 12px;
}
.bw-footer {
  text-align: center;
  padding: 12px;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
}

@media (max-width: 480px) {
  .bw-root { border-radius: 0; box-shadow: none; }
  .bw-time-grid { grid-template-columns: repeat(2, 1fr); }
}
`;
