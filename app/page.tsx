"use client";

import { useState } from "react";
import {
  ArrowRight, Award, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock3,
  GraduationCap, MapPin, Menu, Phone, Sparkles, Target, Users, X
} from "lucide-react";

const courses = [
  { range: "Class 7–8", title: "Foundation", description: "Build confident habits and crystal-clear fundamentals before the board years.", subjects: "Mathematics · Science · English", tone: "sun" },
  { range: "Class 9–10", title: "School + Boards", description: "Concept-led teaching and structured revision for excellent board preparation.", subjects: "Maths · Science · English", tone: "teal" },
  { range: "Class 11–12", title: "Senior Secondary", description: "Focused support for school academics and your next academic milestone.", subjects: "PCM · PCB · Commerce", tone: "navy" },
  { range: "Entrance", title: "JEE Main & Advanced", description: "Rigorous problem-solving, smart test strategy and personal mentorship.", subjects: "Physics · Chemistry · Mathematics", tone: "teal" },
  { range: "Entrance", title: "NEET", description: "A disciplined, high-clarity path to medical entrance readiness.", subjects: "Physics · Chemistry · Biology", tone: "sun" },
];

const notices = [
  ["Academic", "New batches for Class 9 & 10 begin soon", "Please contact the office to learn about the timetable and admissions."],
  ["Tests", "Monthly assessment schedule", "Regular practice tests help students measure progress with confidence."],
  ["Admissions", "Admissions open for the 2026–27 session", "Limited seats in Foundation, Board and entrance preparation programmes."],
];

function Mark() {
  return <div className="mark" aria-hidden="true"><i /><b /></div>;
}

function Logo() { return <a href="#home" className="logo" aria-label="Mentor Academy home"><Mark /><span><strong>MENTOR</strong><small>ACADEMY</small></span></a>; }

export default function Home() {
  const [open, setOpen] = useState(false);
  const nav = ["Home", "About", "Courses", "Results", "Faculty", "Contact"];
  return <main id="home">
    <header className="header">
      <div className="shell nav"><Logo /><nav className={open ? "navlinks open" : "navlinks"}>{nav.map((item) => <a onClick={() => setOpen(false)} href={`#${item.toLowerCase()}`} key={item}>{item}</a>)}<a className="mobile-portal" href="/portal">Student Portal</a></nav><div className="nav-actions"><a className="portal-link" href="/portal">Student Portal <ArrowRight size={15}/></a><button aria-label="Toggle navigation" className="menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></div>
    </header>

    <section className="hero shell">
      <div className="hero-copy"><p className="eyebrow"><span /> A learning space that sees every student</p><h1>Build Your <em>Foundation.</em><br />Shape Your Future.</h1><p className="lead">Strong concepts, regular testing and personal guidance for students from Class 7th to 12th, JEE &amp; NEET.</p><div className="hero-actions"><a href="#courses" className="button primary">Explore Courses <ArrowRight size={18}/></a><a href="#about" className="button quiet">Discover Mentor Academy</a></div><div className="trust"><div className="faces"><span>R</span><span>S</span><span>A</span></div><p><b>Personal guidance</b><br />for every learning journey</p></div></div>
      <div className="hero-visual"><div className="sun-disc"/><div className="hero-card"><p className="eyebrow">THE MENTOR METHOD</p><h3>Clarity. Practice.<br /><em>Confidence.</em></h3><div className="method"><span><BookOpen size={18}/></span><p><b>Learn with depth</b><small>Concepts before shortcuts</small></p></div><div className="method"><span><Target size={18}/></span><p><b>Track your progress</b><small>Tests that shape strategy</small></p></div></div><div className="academic-card"><GraduationCap size={25}/><span>Classes 7–12<br /><b>JEE &amp; NEET</b></span></div><div className="dots"/></div>
    </section>

    <section className="numbers"><div className="shell numbers-grid"><p><b>01</b><span>Personal<br />mentorship</span></p><p><b>02</b><span>Regular<br />assessment</span></p><p><b>03</b><span>Small-batch<br />attention</span></p><p><b>04</b><span>Strong academic<br />foundation</span></p></div></section>

    <section id="about" className="section shell about"><div><p className="eyebrow">ABOUT MENTOR ACADEMY</p><h2>Learning has more<br />than one <em>right answer.</em></h2></div><div className="about-copy"><p>At Mentor Academy, we create the conditions for students to understand deeply, practise deliberately and move forward with confidence.</p><p>Our approach pairs attentive teachers with a purposeful academic rhythm—so every student has a clear next step.</p><a href="#contact" className="text-link">Talk to our team <ArrowRight size={17}/></a></div></section>

    <section id="courses" className="section courses-bg"><div className="shell"><div className="section-heading"><div><p className="eyebrow">OUR PROGRAMMES</p><h2>A path for every<br /><em>ambition.</em></h2></div><p>Thoughtfully designed programmes from school foundations to India&apos;s most competitive entrance examinations.</p></div><div className="course-grid">{courses.map((course) => <article className={`course-card ${course.tone}`} key={course.title}><p className="course-range">{course.range}</p><h3>{course.title}</h3><p>{course.description}</p><small>{course.subjects}</small><a href="#contact" aria-label={`Enquire about ${course.title}`}><ArrowRight size={20}/></a></article>)}</div></div></section>

    <section id="results" className="section shell results"><div className="results-copy"><p className="eyebrow">PROGRESS, NOT PROMISES</p><h2>Every strong result<br />begins with a <em>stronger routine.</em></h2><p>We believe meaningful outcomes are built in the everyday: thoughtful instruction, timely feedback and consistent practice.</p><a className="button primary" href="#contact">Learn our approach <ArrowRight size={18}/></a></div><div className="result-panel"><div className="demo-label"><Sparkles size={15}/> DEMO PREVIEW</div><p className="eyebrow">STUDENT PROGRESS SNAPSHOT</p><h3>Measurable growth,<br />visible confidence.</h3><div className="bars"><span style={{height:"35%"}}/><span style={{height:"48%"}}/><span style={{height:"60%"}}/><span style={{height:"72%"}}/><span style={{height:"88%"}}/></div><div className="chart-axis"><span>Test 1</span><span>Test 2</span><span>Test 3</span><span>Test 4</span><span>Test 5</span></div><p className="disclaimer">Illustrative data only. Real student achievements will be published only with permission.</p></div></section>

    <section id="faculty" className="section faculty-bg"><div className="shell"><div className="section-heading"><div><p className="eyebrow">OUR EDUCATORS</p><h2>Guidance that feels<br /><em>personal.</em></h2></div><p>Our faculty profiles and credentials will be published here as the academic team grows.</p></div><div className="faculty-empty"><div><Users size={30}/></div><h3>Faculty profiles coming soon</h3><p>Meet the educators who will help turn your effort into momentum.</p></div></div></section>

    <section id="notices" className="section shell notices"><div className="notice-title"><p className="eyebrow">WHAT&apos;S HAPPENING</p><h2>Stay in the<br /><em>know.</em></h2><a href="#contact" className="text-link">Contact the office <ArrowRight size={17}/></a></div><div className="notice-list">{notices.map(([tag,title,body], i) => <article key={title}><p><span>{tag}</span><time>{String(i + 8).padStart(2,"0")} Sep</time></p><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section id="contact" className="contact"><div className="shell contact-grid"><div><p className="eyebrow light">START A CONVERSATION</p><h2>Let&apos;s build a<br /><em>brighter next step.</em></h2><p>Visit us, call us, or send a message. We&apos;ll help you find the programme that fits.</p><div className="contact-buttons"><a href="tel:+917408260313" className="button gold"><Phone size={17}/> Call 74082 60313</a><a href="https://wa.me/917408260313" target="_blank" rel="noreferrer" className="button outline">WhatsApp us</a></div></div><div className="address-card"><MapPin size={24}/><h3>Mentor Academy</h3><address>Ashirwad Hospital, Vasant Kunj Colony,<br />Naiganj, Olandganj, Jaunpur,<br />Uttar Pradesh – 222002</address><a target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/?api=1&query=Ashirwad+Hospital%2C+Vasant+Kunj+Colony%2C+Naiganj%2C+Olandganj%2C+Jaunpur%2C+Uttar+Pradesh+222002">Get directions <ArrowRight size={16}/></a></div></div></section>
    <footer><div className="shell footer"><Logo /><p>© {new Date().getFullYear()} Mentor Academy. Building futures with care.</p><a href="#home"><ChevronDown size={18}/> Back to top</a></div></footer>
  </main>;
}
