#!/usr/bin/env python3
"""Generate the IEEE-style project brochure PDF for SolarGrid MPPT.

Output: assets/SolarGrid_MPPT_Brochure.pdf
Run:    python3 tools/generate_brochure.py

Uses fpdf2 (pure-Python, core Helvetica fonts) so it works offline.
"""
import os
from fpdf import FPDF

# ------------------------- palette -------------------------
NAVY   = (11, 20, 55)
NAVY2  = (22, 37, 99)
YELLOW = (255, 200, 0)
GREEN  = (0, 230, 118)
CYAN   = (0, 229, 255)
INK    = (40, 46, 66)
GREY   = (110, 118, 140)
LIGHT  = (238, 242, 250)

# Characters outside latin-1 that core Helvetica cannot render
_CHAR_MAP = {
    "\u2013": "-", "\u2014": "-", "\u2212": "-",
    "\u2192": "->", "\u2190": "<-",
    "\u00d7": "x", "\u2022": "-", "\u25cf": "*",
    "\u2082": "2", "\u2084": "4",
    "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
    "\u2026": "...", "\u00a0": " ",
}


def clean(text):
    """Map non-latin-1 characters to latin-1-safe equivalents."""
    if not isinstance(text, str):
        return text
    for src, dst in _CHAR_MAP.items():
        text = text.replace(src, dst)
    return text


class Brochure(FPDF):
    """IEEE-style multi-page brochure with header/footer."""

    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=20)
        self.page_no_covers = 1

    # ---- latin-1 sanitisation (core Helvetica has no unicode) ----
    def cell(self, *args, **kwargs):
        if "text" in kwargs:
            kwargs["text"] = clean(kwargs["text"])
        elif len(args) >= 3:
            args = (args[0], args[1], clean(args[2]), *args[3:])
        return super().cell(*args, **kwargs)

    def multi_cell(self, *args, **kwargs):
        if "text" in kwargs:
            kwargs["text"] = clean(kwargs["text"])
        elif len(args) >= 3:
            args = (args[0], args[1], clean(args[2]), *args[3:])
        return super().multi_cell(*args, **kwargs)

    # ---- page furniture ----
    def header(self):
        if self.page_no() <= 1:
            return  # no header on the cover
        self.set_font("helvetica", "", 7.5)
        self.set_text_color(*GREY)
        self.set_y(8)
        self.cell(0, 5, "IoT-Based Solar Microgrid Energy Management System with MPPT", align="L")
        self.cell(0, 5, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*LIGHT)
        self.line(10, 15, 200, 15)

    def footer(self):
        if self.page_no() <= 1:
            return
        self.set_y(-14)
        self.set_font("helvetica", "I", 7.5)
        self.set_text_color(*GREY)
        self.cell(0, 5, "Final Year Engineering Project  \u00b7  IEEE-Style Documentation", align="C")

    # ---- helpers ----
    def section_title(self, num, title):
        self.set_font("helvetica", "B", 12.5)
        self.set_text_color(*NAVY)
        self.multi_cell(0, 7, f"{num}   {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*YELLOW)
        self.set_line_width(0.7)
        y = self.get_y()
        self.line(10, y, 40, y)
        self.set_line_width(0.2)
        self.ln(3)

    def body(self, text):
        self.set_font("helvetica", "", 9.8)
        self.set_text_color(*INK)
        self.multi_cell(0, 5.2, text, align="J", new_x="LMARGIN", new_y="NEXT")
        self.ln(1.5)

    def bullet(self, text):
        self.set_font("helvetica", "", 9.8)
        self.set_text_color(*INK)
        x = self.get_x()
        self.cell(5, 5.2, "\u2022")
        self.multi_cell(0, 5.2, text, new_x="LMARGIN", new_y="NEXT")

    def kpi_row(self, cells):
        """Horizontal band of labelled numbers."""
        w = 180 / len(cells)
        for label, value, color in cells:
            self.set_fill_color(*LIGHT)
            self.rect(self.get_x(), self.get_y(), w - 3, 16, style="F")
            self.set_xy(self.get_x() + 2, self.get_y() + 1)
            self.set_font("helvetica", "B", 13)
            self.set_text_color(*color)
            self.cell(w - 7, 6, value, align="C")
            self.set_xy(self.get_x() + 2, self.get_y() + 8)
            self.set_font("helvetica", "", 6.5)
            self.set_text_color(*GREY)
            self.cell(w - 7, 4, label, align="C")
            self.set_xy(self.get_x() + (w - 3), self.get_y() - 16)
        self.ln(19)

    def block(self, x, y, w, h, label, sub, color):
        """Draw one block of the architecture diagram."""
        self.set_fill_color(*NAVY2)
        self.set_draw_color(*color)
        self.set_line_width(0.4)
        self.rect(x, y, w, h, style="DF")
        self.set_xy(x, y + h / 2 - 6)
        self.set_font("helvetica", "B", 8)
        self.set_text_color(255, 255, 255)
        self.cell(w, 5, label, align="C")
        self.set_xy(x, y + h / 2 + 1)
        self.set_font("helvetica", "", 6)
        self.set_text_color(*color)
        self.cell(w, 4, sub, align="C")

    def arrow(self, x, y, color):
        self.set_draw_color(*color)
        self.set_line_width(0.5)
        self.line(x, y, x + 7, y)
        self.set_fill_color(*color)
        self.polygon([(x + 7, y - 1.4), (x + 7, y + 1.4), (x + 10, y)], style="F")
        self.set_line_width(0.2)


def build():
    pdf = Brochure()

    # ==================================================================
    # COVER
    # ==================================================================
    pdf.add_page()
    pdf.set_fill_color(*NAVY)
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.set_fill_color(*NAVY2)
    pdf.rect(0, 0, 210, 3.5, style="F")
    pdf.set_fill_color(*YELLOW)
    pdf.rect(0, 3.5, 70, 1.2, style="F")
    pdf.set_fill_color(*GREEN)
    pdf.rect(70, 3.5, 70, 1.2, style="F")
    pdf.set_fill_color(*CYAN)
    pdf.rect(140, 3.5, 70, 1.2, style="F")

    # logo: sun + bolt drawn from primitives
    cx, cy = 105, 52
    pdf.set_fill_color(*YELLOW)
    pdf.circle(cx, cy, 9)
    pdf.set_draw_color(*YELLOW)
    pdf.set_line_width(0.8)
    for dx, dy in [(0, -14), (0, 14), (-14, 0), (14, 0), (-10, -10), (10, 10), (10, -10), (-10, 10)]:
        pdf.line(cx, cy, cx + dx, cy + dy)
    pdf.set_draw_color(*GREEN)
    pdf.set_line_width(0.6)
    pdf.set_fill_color(*GREEN)
    for angle in range(0, 360, 45):
        import math
        r = 30
        a = math.radians(angle)
        x1, y1 = cx + r * math.cos(a), cy + r * math.sin(a)
        x2, y2 = cx + (r + 3.5) * math.cos(a), cy + (r + 3.5) * math.sin(a)
        pdf.line(x1, y1, x2, y2)

    pdf.set_y(84)
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(*CYAN)
    pdf.cell(0, 6, "IEEE-STYLE PROJECT DOCUMENTATION", align="C")
    pdf.ln(8)
    pdf.set_font("helvetica", "B", 22)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, "IoT-Based Solar Microgrid Energy", align="C")
    pdf.ln(10)
    pdf.cell(0, 10, "Management System with MPPT", align="C")
    pdf.ln(10)
    pdf.set_draw_color(*YELLOW)
    pdf.set_line_width(0.8)
    pdf.line(70, pdf.get_y(), 140, pdf.get_y())
    pdf.set_line_width(0.2)
    pdf.ln(8)
    pdf.set_font("helvetica", "", 11)
    pdf.set_text_color(191, 233, 255)
    pdf.cell(0, 6, "Intelligent solar microgrid management powered by IoT, MPPT", align="C")
    pdf.ln(6)
    pdf.cell(0, 6, "optimization, and real-time energy analytics.", align="C")
    pdf.ln(20)
    pdf.set_font("helvetica", "", 9.5)
    pdf.set_text_color(157, 180, 224)
    pdf.cell(0, 5, "Final Year Engineering Project  \u00b7  2025 \u2013 2026", align="C")
    pdf.ln(5)
    pdf.cell(0, 5, "Department of Electrical & Electronics Engineering", align="C")
    pdf.ln(5)
    pdf.cell(0, 5, "Your University Name (placeholder)", align="C")
    pdf.ln(16)
    pdf.set_font("helvetica", "B", 8)
    pdf.set_text_color(*GREEN)
    pdf.cell(0, 5, "\u25cf  PROJECT STATUS: DEPLOYED & MONITORING", align="C")

    # ==================================================================
    # ABSTRACT + KEYWORDS
    # ==================================================================
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(*NAVY)
    pdf.cell(0, 9, "Abstract", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_fill_color(*LIGHT)
    pdf.set_draw_color(*YELLOW)
    pdf.set_line_width(0.6)
    pdf.set_xy(10, pdf.get_y())
    pdf.multi_cell(190, 5.6,
        "This project presents an IoT-Based Solar Microgrid Energy Management System with Maximum "
        "Power Point Tracking (MPPT) designed to maximize solar power extraction and improve energy "
        "management. The system integrates a photovoltaic array, an MPPT charge controller, lithium "
        "battery storage and an IoT monitoring layer built around an ESP32 controller. Real-time "
        "measurements of voltage, current, power, battery state-of-charge, temperature and load "
        "consumption are streamed over MQTT to a cloud database and rendered on a live web dashboard. "
        "The platform delivers MPPT optimization, fault detection, remote load control, energy "
        "analytics and AI-based generation and load forecasting, improving efficiency, reliability "
        "and sustainability compared with conventional fixed-voltage solar systems.",
        align="J", new_x="LMARGIN", new_y="NEXT")
    pdf.set_line_width(0.2)
    pdf.ln(5)

    pdf.set_font("helvetica", "B", 9.5)
    pdf.set_text_color(*NAVY)
    pdf.cell(22, 6, "Index Terms \u2014", align="L")
    pdf.set_font("helvetica", "", 9.5)
    pdf.set_text_color(*INK)
    pdf.cell(0, 6, "IoT, Maximum Power Point Tracking (MPPT), Solar Microgrid, ESP32, MQTT, "
                   "Battery Energy Storage, Cloud Analytics, AI Forecasting.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    pdf.kpi_row([
        ("MPPT Tracking", "98.2%", (255, 171, 0)),
        ("Yield Improvement", "+30%", (0, 166, 92)),
        ("Grid Offset", "92%", (0, 153, 201)),
        ("CO2 Reduced / Yr", "1.8 t", (0, 230, 118)),
    ])

    # ---- I. Introduction ----
    pdf.section_title("I.", "Introduction")
    pdf.body(
        "Traditional solar energy systems frequently lose efficiency because the output of a solar "
        "panel changes continuously with sunlight, temperature, battery condition and load demand. "
        "Without intelligent monitoring and control, energy is wasted, battery life is reduced and "
        "faults may go undetected for long periods. This project replaces the passive approach with "
        "an active, connected microgrid: MPPT algorithms extract the maximum possible power from the "
        "array, while IoT sensors give operators complete real-time visibility and remote control "
        "over the entire energy flow \u2014 from panel to load.")

    pdf.section_title("II.", "Problem Statement")
    pdf.body(
        "Conventional solar installations operate at a fixed voltage point that rarely matches the "
        "panel's true Maximum Power Point, particularly under partial shading or changing irradiance. "
        "Operators lack real-time insight into generation, storage, consumption and thermal state, "
        "delaying fault response and preventing optimal scheduling. The objective of this project is "
        "to solve these problems by combining MPPT control, IoT sensing, cloud storage and a web "
        "dashboard into a single intelligent energy management system.")

    # ==================================================================
    # ARCHITECTURE + MPPT
    # ==================================================================
    pdf.add_page()
    pdf.section_title("III.", "System Architecture")
    pdf.body(
        "The system is organized into two complementary layers: a power layer that converts and "
        "stores solar energy, and an IoT telemetry layer that senses, transmits and visualizes data.")

    # power row
    y = pdf.get_y()
    w, h, gap = 36, 22, 3
    xs = [12 + (w + gap + 9) * i for i in range(5)]
    pdf.block(xs[0], y, w, h, "Solar Panel", "320W \u00d7 4", YELLOW)
    pdf.arrow(xs[0] + w, y + h / 2, GREEN)
    pdf.block(xs[1], y, w, h, "MPPT Controller", "P&O / IncCond / AI", CYAN)
    pdf.arrow(xs[1] + w, y + h / 2, GREEN)
    pdf.block(xs[2], y, w, h, "Battery Bank", "48V LiFePO\u2084", GREEN)
    pdf.arrow(xs[2] + w, y + h / 2, GREEN)
    pdf.block(xs[3], y, w, h, "Inverter", "1.5 kVA", (255, 171, 46))
    pdf.arrow(xs[3] + w, y + h / 2, GREEN)
    pdf.block(xs[4], y, w, h, "AC / DC Loads", "Lights / Pump / Fan", (233, 238, 252))
    pdf.ln(h + 6)

    pdf.set_font("helvetica", "I", 8.5)
    pdf.set_text_color(*GREY)
    pdf.cell(0, 5, "Power path \u2014 energy flows left to right; MPPT keeps every stage at peak efficiency.", align="C")
    pdf.ln(10)

    # iot row
    y = pdf.get_y()
    iw, ih, ix = 36, 22, 3
    ixs = [12 + (iw + gap + 9) * i for i in range(4)]
    pdf.block(ixs[0], y, iw, ih, "IoT Sensors", "V / I / Temp", CYAN)
    pdf.arrow(ixs[0] + iw, y + ih / 2, GREEN)
    pdf.block(ixs[1], y, iw, ih, "ESP32", "MQTT \u00b7 Wi-Fi", GREEN)
    pdf.arrow(ixs[1] + iw, y + ih / 2, GREEN)
    pdf.block(ixs[2], y, iw, ih, "Cloud Database", "Time-series", (0, 153, 201))
    pdf.arrow(ixs[2] + iw, y + ih / 2, GREEN)
    pdf.block(ixs[3], y, iw, ih, "Web Dashboard", "Live analytics", YELLOW)
    pdf.ln(ih + 6)

    pdf.set_font("helvetica", "I", 8.5)
    pdf.set_text_color(*GREY)
    pdf.cell(0, 5, "Telemetry path \u2014 sensors \u2192 ESP32 \u2192 MQTT broker \u2192 cloud \u2192 dashboard (and control commands back).", align="C")
    pdf.ln(10)

    pdf.section_title("IV.", "MPPT Technology")
    pdf.body(
        "Maximum Power Point Tracking continuously adjusts the operating voltage and current of the "
        "array so the maximum possible power is extracted under changing sunlight and temperature. "
        "The controller compares power before and after each perturbation and converges on the peak "
        "of the P-V curve, where dP/dV = 0. The implemented algorithms are:")
    for t in [
        "Perturb & Observe \u2014 classic hill-climbing; simple and robust, ideal for stable irradiance.",
        "Incremental Conductance \u2014 compares I/V with dI/dV for precise tracking under rapid changes.",
        "Fuzzy Logic MPPT \u2014 rule-based controller that handles non-linear and partial-shading cases.",
        "AI-Based MPPT \u2014 machine-learning model predicts the optimum point ahead of irradiance shifts.",
    ]:
        pdf.bullet(t)

    # ==================================================================
    # FEATURES + RESULTS
    # ==================================================================
    pdf.add_page()
    pdf.section_title("V.", "Dashboard & System Features")
    for t in [
        "Real-time monitoring of solar voltage, current, power, battery percentage, load, temperature.",
        "Animated energy-flow visualization between panel \u2192 MPPT \u2192 battery \u2192 inverter \u2192 load.",
        "Live sensor telemetry charts for voltage, current, power, battery SOC, temperature and efficiency.",
        "Fault detection with severity classification, alert feed and full incident history.",
        "Remote load control via a 4-channel relay module with smart scheduling.",
        "AI weather-based prediction of solar generation and load demand for the next 48 hours.",
        "CO\u2082-savings and energy-savings reporting with exportable monthly summaries.",
    ]:
        pdf.bullet(t)

    pdf.section_title("VI.", "Results & Performance")
    pdf.body("The system was validated over a two-week period spanning sunny, partly cloudy and "
             "shaded conditions. Representative measurements are summarized below.")
    pdf.set_font("helvetica", "B", 9)
    pdf.set_text_color(*NAVY)
    headers = ["Metric", "Value", "Metric", "Value"]
    rows = [
        ["Peak generation", "1.52 kW", "Daily energy", "8.4 kWh"],
        ["MPPT tracking", "98.2%", "Battery capacity", "4.8 kWh"],
        ["System efficiency", "96.4%", "Load coverage", "92%"],
        ["Fault response", "< 3 s", "CO\u2082 saved / day", "4.2 kg"],
    ]
    with pdf.table(col_widths=(45, 50, 45, 50), text_align="LEFT", line_height=6) as table:
        table.row([clean(c) for c in headers])
        for r in rows:
            table.row([clean(c) for c in r])
    pdf.ln(3)

    pdf.section_title("VII.", "Applications & Benefits")
    for t in [
        "Applications: rural electrification, smart homes, agriculture and irrigation, telecom "
        "towers, small industries, emergency backup, EV charging stations and smart city infrastructure.",
        "Benefits: maximum solar extraction, reduced wastage, better battery management, real-time "
        "control, lower electricity cost, improved reliability and measurable carbon reduction.",
    ]:
        pdf.body(t)

    # ==================================================================
    # FUTURE + CONCLUSION + REFERENCES
    # ==================================================================
    pdf.add_page()
    pdf.section_title("VIII.", "Future Scope")
    for t in [
        "AI-based energy optimization and reinforcement-learning controllers.",
        "Native mobile app with push notifications and voice-assistant support.",
        "EV charging integration with vehicle-to-grid (V2G) capability.",
        "Blockchain-based peer-to-peer energy trading between microgrid neighbours.",
        "Grid-connected operation with net metering and demand-response services.",
        "Advanced fault prediction using vibration, thermal and electrical signatures.",
        "Large-scale smart city deployment with centralized energy intelligence.",
    ]:
        pdf.bullet(t)

    pdf.section_title("IX.", "Conclusion")
    pdf.body(
        "The IoT-Based Solar Microgrid Energy Management System with MPPT demonstrates how the "
        "combination of power electronics, IoT, cloud computing and machine learning can transform a "
        "conventional solar installation into an intelligent, self-optimizing energy platform. With "
        "98%+ MPPT tracking efficiency, real-time telemetry, automated fault response and AI-based "
        "forecasting, the system delivers measurable gains in energy yield, reliability and "
        "sustainability \u2014 providing a scalable blueprint for smart microgrids of the future.")

    pdf.section_title("X.", "References")
    pdf.set_font("helvetica", "", 8.6)
    pdf.set_text_color(*INK)
    refs = [
        "[1] B. Subudhi and R. Pradhan, \u201cA comparative study on maximum power point tracking techniques for photovoltaic power systems,\u201d IEEE Trans. Sustain. Energy, vol. 4, no. 1, pp. 89\u201398, Jan. 2013.",
        "[2] N. Femia, G. Petrone, G. Spagnuolo, and M. Vitelli, \u201cOptimization of perturb and observe maximum power point tracking method,\u201d IEEE Trans. Power Electron., vol. 20, no. 4, pp. 963\u2013973, Jul. 2005.",
        "[3] M. A. Elgendy, B. Zahawi, and D. J. Atkinson, \u201cAssessment of the incremental conductance maximum power point tracking algorithm,\u201d IEEE Trans. Sustain. Energy, vol. 4, no. 1, pp. 108\u2013117, Jan. 2013.",
        "[4] T. Esram and P. L. Chapman, \u201cComparison of photovoltaic array maximum power point tracking techniques,\u201d IEEE Trans. Energy Convers., vol. 22, no. 2, pp. 439\u2013449, Jun. 2007.",
        "[5] Y. Saleem, N. Crespi, M. H. Rehmani, and R. Copeland, \u201cInternet of Things-aided smart grid: technologies, architectures, applications, prototypes, and future research directions,\u201d IEEE Access, vol. 7, pp. 62962\u201363003, 2019.",
    ]
    for r in refs:
        pdf.multi_cell(0, 4.6, r, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)

    pdf.ln(6)
    pdf.set_font("helvetica", "I", 8.5)
    pdf.set_text_color(*GREY)
    pdf.cell(0, 5, "Prepared as part of the final-year project showcase. Figures are representative "
                   "of the deployed prototype.", align="C")

    # ------------------------- output -------------------------
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "SolarGrid_MPPT_Brochure.pdf")
    out = os.path.normpath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    pdf.output(out)
    print("Wrote", out)


if __name__ == "__main__":
    build()
