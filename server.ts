import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const currentDir = process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory persistent data store matching Firestore schema
interface Appointment {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  date: string;
  time: string;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
  calendarEventId?: string;
  emailSentToPatient: boolean;
  emailSentToClinic: boolean;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  duration: string;
  category: string;
  priceRange?: string;
  iconName: string;
  popular?: boolean;
}

interface ClinicInfo {
  name: string;
  tagline: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  phone: string;
  emergencyPhone: string;
  whatsapp: string;
  email: string;
  hours: {
    monday_friday: string;
    saturday: string;
    sunday: string;
  };
  socials: {
    facebook: string;
    instagram: string;
    linkedin: string;
    whatsapp: string;
  };
  calendarMode: "workspace" | "personal_gmail";
  calendarAccountEmail: string;
}

// Initial Mock Seed Data matching Firestore Schema
let clinicInfo: ClinicInfo = {
  name: "LankaCare Dental Clinic",
  tagline: "Gentle, Modern & Trusted Dental Care in Colombo",
  address: "142 Galle Road, Bambalapitiya",
  city: "Colombo 03",
  country: "Sri Lanka",
  postalCode: "00300",
  phone: "+94 11 258 4930",
  emergencyPhone: "+94 77 123 4567",
  whatsapp: "+94771234567",
  email: "appointments@lankacare.lk",
  hours: {
    monday_friday: "8:30 AM – 7:30 PM",
    saturday: "9:00 AM – 5:00 PM",
    sunday: "9:30 AM – 1:30 PM (Emergency & Scheduled Only)"
  },
  socials: {
    facebook: "https://facebook.com/LankaCareDental",
    instagram: "https://instagram.com/lankacare_dental",
    linkedin: "https://linkedin.com/company/lankacare-dental",
    whatsapp: "https://wa.me/94771234567"
  },
  calendarMode: "workspace",
  calendarAccountEmail: "reception@lankacare.lk"
};

let services: ServiceItem[] = [
  {
    id: "serv-1",
    name: "Routine Dental Exam & Ultrasonic Cleaning",
    description: "Full mouth digital assessment, gentle ultrasonic tartar removal, airflow stain polishing, and personalized oral health coaching.",
    duration: "45 mins",
    category: "Preventive Care",
    priceRange: "LKR 3,500 – 5,000",
    iconName: "Sparkles",
    popular: true
  },
  {
    id: "serv-2",
    name: "Tooth-Colored Composite Fillings",
    description: "Seamless bio-compatible resin fillings matched to natural tooth enamel shades for cavity repair and chipped enamel restoration.",
    duration: "45 mins",
    category: "Restorative",
    priceRange: "LKR 4,500 – 8,500",
    iconName: "ShieldCheck",
    popular: true
  },
  {
    id: "serv-3",
    name: "Single-Visit Modern Root Canal Therapy",
    description: "Pain-relieving micro-endodontic therapy using rotary nickel-titanium instruments to preserve natural teeth with maximum comfort.",
    duration: "60–90 mins",
    category: "Endodontics",
    priceRange: "LKR 25,000 – 48,000",
    iconName: "Activity",
    popular: false
  },
  {
    id: "serv-4",
    name: "In-Chair Laser Teeth Whitening",
    description: "Safe, immediate cosmetic whitening technology lifting coffee, tea, and tobacco stains by up to 6–8 shades in a single session.",
    duration: "60 mins",
    category: "Cosmetic Dentistry",
    priceRange: "LKR 32,000 – 45,000",
    iconName: "Sun",
    popular: true
  },
  {
    id: "serv-5",
    name: "Clear Aligners & Orthodontic Braces",
    description: "Custom invisible aligners and aesthetic ceramic or metallic braces for precision bite correction and smile alignment.",
    duration: "30–45 mins consult",
    category: "Orthodontics",
    priceRange: "Consult LKR 3,000 / Plan based",
    iconName: "Smile",
    popular: false
  },
  {
    id: "serv-6",
    name: "Titanium Dental Implants & Zirconia Crowns",
    description: "Permanent, natural-feeling tooth replacements featuring biocompatible titanium posts and handcrafted porcelain/zirconia crowns.",
    duration: "60 mins consult",
    category: "Prosthodontics",
    priceRange: "Consult LKR 3,500 / Implant pkg",
    iconName: "Crown",
    popular: false
  },
  {
    id: "serv-7",
    name: "Gentle Pediatric Dental Care",
    description: "Warm, anxiety-free dentistry designed specifically for children, including cavity prevention, fluoride varnish, and fissure sealants.",
    duration: "30–40 mins",
    category: "Pediatric Dentistry",
    priceRange: "LKR 3,000 – 4,500",
    iconName: "HeartHandshake",
    popular: true
  },
  {
    id: "serv-8",
    name: "Emergency Dental Pain Relief",
    description: "Same-day priority evaluation for acute toothaches, dental abscesses, broken teeth, dislodged crowns, and sports injuries.",
    duration: "30–45 mins",
    category: "Emergency Care",
    priceRange: "LKR 3,500 – 6,000",
    iconName: "AlertCircle",
    popular: false
  }
];

let appointments: Appointment[] = [
  {
    id: "LC-2026-8101",
    name: "Dilshan Perera",
    phone: "+94 77 554 3210",
    email: "dilshan.perera@example.com",
    service: "Routine Dental Exam & Ultrasonic Cleaning",
    date: "2026-09-18",
    time: "10:00 AM",
    notes: "Regular 6-month checkup, slight sensitivity on lower left molar.",
    status: "confirmed",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    calendarEventId: "cal_evt_8101",
    emailSentToPatient: true,
    emailSentToClinic: true
  },
  {
    id: "LC-2026-8102",
    name: "Kavindi Silva",
    phone: "+94 71 889 4432",
    email: "kavindi.s@example.com",
    service: "In-Chair Laser Teeth Whitening",
    date: "2026-09-19",
    time: "02:30 PM",
    notes: "Preparing for wedding in November.",
    status: "confirmed",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    calendarEventId: "cal_evt_8102",
    emailSentToPatient: true,
    emailSentToClinic: true
  },
  {
    id: "LC-2026-8103",
    name: "Rohan Jayawardena",
    phone: "+94 76 345 6789",
    email: "rohan.j@example.com",
    service: "Clear Aligners & Orthodontic Braces",
    date: "2026-09-21",
    time: "11:30 AM",
    notes: "Inquiry about invisible clear aligners timeline.",
    status: "pending",
    createdAt: new Date().toISOString(),
    calendarEventId: "cal_evt_8103",
    emailSentToPatient: true,
    emailSentToClinic: true
  }
];

// Lazy-initialized Gemini AI client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", clinic: clinicInfo.name, version: "1.0.0" });
});

// Clinic Info (Firestore clinicInfo schema)
app.get("/api/clinic-info", (_req, res) => {
  res.json(clinicInfo);
});

app.put("/api/clinic-info", (req, res) => {
  clinicInfo = {
    ...clinicInfo,
    ...req.body,
    hours: { ...clinicInfo.hours, ...(req.body.hours || {}) },
    socials: { ...clinicInfo.socials, ...(req.body.socials || {}) }
  };
  res.json({ success: true, clinicInfo });
});

// Services (Firestore services schema)
app.get("/api/services", (_req, res) => {
  res.json(services);
});

// Appointments (Firestore appointments schema)
app.get("/api/appointments", (req, res) => {
  const status = req.query.status as string;
  let filtered = [...appointments];
  if (status && status !== "all") {
    filtered = filtered.filter((a) => a.status === status);
  }
  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(filtered);
});

app.post("/api/appointments", (req, res) => {
  const { name, phone, email, service, date, time, notes } = req.body;

  if (!name || !phone || !email || !service || !date || !time) {
    return res.status(400).json({ error: "Missing required appointment fields" });
  }

  const id = `LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const calendarEventId = `cal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newAppointment: Appointment = {
    id,
    name,
    phone,
    email,
    service,
    date,
    time,
    notes: notes || "",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    calendarEventId,
    emailSentToPatient: true,
    emailSentToClinic: true
  };

  appointments.unshift(newAppointment);

  // Generate Google Calendar Link parameters
  const eventTitle = encodeURIComponent(`LankaCare Dental: ${service} (${name})`);
  const eventDetails = encodeURIComponent(
    `Appointment Reference: ${id}\nPatient: ${name}\nPhone: ${phone}\nService: ${service}\nNotes: ${notes || "None"}\n\nLocation: LankaCare Dental Clinic, 142 Galle Road, Bambalapitiya, Colombo 03, Sri Lanka.\nPhone: +94 11 258 4930`
  );
  const eventLocation = encodeURIComponent("142 Galle Road, Bambalapitiya, Colombo 03, Sri Lanka");

  // Format date-time for Google Calendar (default standard ISO representation)
  const [year, month, day] = date.split("-");
  let startHour = 10;
  let startMinute = 0;
  if (time.includes(":")) {
    const parts = time.replace(/(AM|PM)/i, "").trim().split(":");
    startHour = parseInt(parts[0], 10);
    startMinute = parseInt(parts[1], 10);
    if (time.toUpperCase().includes("PM") && startHour < 12) startHour += 12;
    if (time.toUpperCase().includes("AM") && startHour === 12) startHour = 0;
  }
  const endHour = startHour + 1;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const gcalStart = `${year}${pad(parseInt(month, 10))}${pad(parseInt(day, 10))}T${pad(startHour)}${pad(startMinute)}00`;
  const gcalEnd = `${year}${pad(parseInt(month, 10))}${pad(parseInt(day, 10))}T${pad(endHour)}${pad(startMinute)}00`;

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${gcalStart}/${gcalEnd}&details=${eventDetails}&location=${eventLocation}`;

  // Simulated notification dispatch confirmation
  const notificationDispatch = {
    patientEmailDispatchedTo: email,
    clinicEmailDispatchedTo: clinicInfo.email,
    cloudFunctionTimestamp: new Date().toISOString(),
    calendarSyncStatus: "synced_successfully",
    calendarMode: clinicInfo.calendarMode
  };

  res.status(201).json({
    success: true,
    appointment: newAppointment,
    googleCalendarUrl,
    notificationDispatch
  });
});

// Update appointment status
app.patch("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  const { status, notes, date, time } = req.body;

  const index = appointments.findIndex((a) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  if (status) appointments[index].status = status;
  if (notes !== undefined) appointments[index].notes = notes;
  if (date) appointments[index].date = date;
  if (time) appointments[index].time = time;

  res.json({ success: true, appointment: appointments[index] });
});

// Delete appointment
app.delete("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  appointments = appointments.filter((a) => a.id !== id);
  res.json({ success: true });
});

// AI Chatbot endpoint powered by Gemini 3.8 Flash
app.post("/api/chat", async (req, res) => {
  const { message, conversationHistory } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  const systemInstruction = `
You are "LankaCare Assistant", the helpful, polite, and professional virtual front desk representative for LankaCare Dental Clinic in Colombo, Sri Lanka.
This website is a GET AI Agency Demo Portfolio Project, showcasing an intelligent, responsive digital clinic experience.

YOUR STRICT KNOWLEDGE BOUNDARIES & POLICIES:
1. CLINIC DETAILS:
   - Name: LankaCare Dental Clinic
   - Address: 142 Galle Road, Bambalapitiya, Colombo 03, Sri Lanka (near Majestic City / Bambalapitiya Junction).
   - Phone: +94 11 258 4930 | Emergency / WhatsApp: +94 77 123 4567
   - Email: appointments@lankacare.lk
   - Hours:
     * Monday to Friday: 8:30 AM – 7:30 PM
     * Saturday: 9:00 AM – 5:00 PM
     * Sunday: 9:30 AM – 1:30 PM (Emergency care & pre-scheduled visits only)

2. SERVICES & INDICATIVE PRICE RANGES:
   - Routine Dental Exam & Ultrasonic Cleaning: 45 mins | LKR 3,500 – 5,000
   - Tooth-Colored Composite Fillings: 45 mins | LKR 4,500 – 8,500 per surface
   - Single-Visit Root Canal Therapy: 60–90 mins | LKR 25,000 – 48,000
   - In-Chair Laser Teeth Whitening: 60 mins | LKR 32,000 – 45,000
   - Clear Aligners & Braces: Consultation LKR 3,000 | Customized full treatment plan
   - Titanium Dental Implants: Initial assessment LKR 3,500 | Comprehensive implant packages
   - Gentle Pediatric Dental Care: 30–40 mins | LKR 3,000 – 4,500
   - Emergency Dental Pain Relief: Priority walk-in/same-day booking | LKR 3,500 – 6,000

3. INSURANCE & PAYMENTS:
   - We accept Cash, Credit/Debit cards (Visa, Mastercard, AMEX), and LankaQR digital transfers.
   - We assist with direct billing and insurance claim documentation for major Sri Lankan private health insurance providers (Ceylinco, AIA, Softlogic Life, Union Assurance, Sri Lanka Insurance, Allianz).

4. HOW TO BOOK:
   - Patients can instantly book by clicking the "Book Appointment" button on the site, calling +94 11 258 4930, or messaging via WhatsApp (+94 77 123 4567).

5. CRITICAL MEDICAL SAFETY MANDATE (DO NOT VIOLATE):
   - You are NOT a doctor. You must NEVER give medical advice, diagnose a condition, or recommend specific medications/antibiotics.
   - If a patient mentions acute symptoms (e.g. severe swelling, unbearable throbbing pain, facial trauma, bleeding), warmly express empathy and explicitly advise them:
     "Please contact our emergency line at +94 77 123 4567 immediately or visit LankaCare Dental Clinic or the nearest hospital emergency dental unit for an in-person clinical examination."
   - Keep answers clear, concise, conversational, and welcoming with authentic Sri Lankan warmth (Ayubowan / Welcome).
`.trim();

  const generateFallbackReply = (text: string) => {
    const lower = text.toLowerCase();
    let reply = "Ayubowan! Welcome to LankaCare Dental Clinic. I am your clinic virtual assistant. ";

    if (lower.includes("hour") || lower.includes("open") || lower.includes("time") || lower.includes("sunday") || lower.includes("saturday")) {
      reply += "We are open Monday–Friday from 8:30 AM to 7:30 PM, Saturday from 9:00 AM to 5:00 PM, and Sunday from 9:30 AM to 1:30 PM (for emergency and pre-scheduled visits).";
    } else if (lower.includes("where") || lower.includes("location") || lower.includes("address") || lower.includes("map")) {
      reply += "We are located at 142 Galle Road, Bambalapitiya, Colombo 03, Sri Lanka (opposite Bambalapitiya Junction, 200m south of Majestic City). Free patient basement parking is available!";
    } else if (lower.includes("cost") || lower.includes("price") || lower.includes("fee") || lower.includes("rate") || lower.includes("whitening")) {
      reply += "Our standard checkup & ultrasonic cleaning ranges from LKR 4,500 – 7,500, composite fillings from LKR 5,000, and professional in-chair LED whitening is LKR 28,000 – 45,000. All final treatment quotes are itemized transparently prior to any work.";
    } else if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) {
      reply += "You can reserve your preferred date and chair time instantly using our 'Book Appointment' portal, or contact our front desk at +94 11 258 4930 or WhatsApp +94 77 123 4567.";
    } else if (lower.includes("pain") || lower.includes("hurt") || lower.includes("bleed") || lower.includes("swell") || lower.includes("emergency")) {
      reply += "If you have acute toothache, trauma, or swelling, please call our 24/7 priority emergency line at +94 77 123 4567 or visit our clinic at 142 Galle Road immediately. Please do not self-medicate with painkillers without an examination.";
    } else if (lower.includes("insurance") || lower.includes("claim")) {
      reply += "Yes! LankaCare supports direct documentation and itemized claim paperwork for major private Sri Lankan health insurance providers.";
    } else {
      reply += "How may I assist you today? You can ask me about our dental services, opening hours, pricing guides, accepted insurance, or how to book your visit.";
    }

    return reply;
  };

  const ai = getGenAI();

  if (!ai) {
    const reply = generateFallbackReply(message);
    return res.json({ reply, fallback: true });
  }

  try {
    const formattedHistory = Array.isArray(conversationHistory)
      ? conversationHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        }))
      : [];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...formattedHistory,
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      config: {
        systemInstruction,
        temperature: 0.4,
      }
    });

    const reply = response.text || "Thank you for reaching out to LankaCare Dental Clinic. How else may I assist you today?";
    res.json({ reply });
  } catch (error: any) {
    console.error("Gemini Chat API Notice (using grounded fallback):", error?.message || error);
    const reply = generateFallbackReply(message);
    res.json({ reply, fallback: true });
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LankaCare Dental Clinic server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
