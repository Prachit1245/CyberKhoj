import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "Is CyberKhoj completely free?",
    a: "Yes. CyberKhoj is 100% free forever. You only need a free Groq API key from console.groq.com which gives you 1000 free analyses every single day. There are no hidden costs, no premium tiers, and no subscription fees.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account needed. Just get a free Groq API key at console.groq.com and paste it into CyberKhoj. Start analyzing immediately with no signup required. Your API key is stored only in your browser's localStorage.",
  },
  {
    q: "What vulnerabilities does CyberKhoj detect?",
    a: "CyberKhoj generates attack paths for IDOR, SQL Injection, XSS, SSRF, Authentication Bypass, LFI, CSRF, JWT attacks, Race Conditions, Business Logic flaws, and many more vulnerability categories. It covers the full OWASP Top 10 and beyond.",
  },
  {
    q: "Is my data private and secure?",
    a: "Yes. CyberKhoj stores nothing on any server. Your API key and all analysis data stays in your browser localStorage only. We have zero servers, zero tracking, and zero data collection. Everything runs locally in your browser.",
  },
  {
    q: "Can beginners use CyberKhoj?",
    a: "Yes. CyberKhoj was specifically built for bug bounty beginners who struggle with knowing what to test. It explains each vulnerability in plain English with step by step testing instructions, payload examples, and OWASP references.",
  },
  {
    q: "How many analyses can I run per day?",
    a: "You can run up to 1000 analyses per day using the free Groq API key. This limit resets every 24 hours. Most bug bounty hunters use far fewer than 1000 per day, so you will effectively have unlimited usage.",
  },
  {
    q: "What is a Groq API key and where do I get it?",
    a: "Groq is a free AI inference provider. Visit console.groq.com, create a free account in 30 seconds, and generate an API key. Paste that key into CyberKhoj and you are ready to go. No credit card required. Works worldwide.",
  },
  {
    q: "Is CyberKhoj legal to use?",
    a: "CyberKhoj is an educational tool for authorized security testing only. You must only use it on targets you have explicit permission to test, such as bug bounty programs on HackerOne, Bugcrowd, or your own assets. Unauthorized testing is illegal.",
  },
];

const LandingFAQ = () => {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(0.1);

  return (
    <section ref={ref} className="relative py-20 md:py-28 px-4 bg-background" id="faq">
      <div
        className={`max-w-3xl mx-auto space-y-10 transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-foreground">
            Frequently Asked{" "}
            <span className="text-primary text-glow-primary">Questions</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-mono max-w-lg mx-auto">
            Everything you need to know about CyberKhoj
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-border bg-card px-5 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-left font-heading text-sm md:text-base font-bold text-foreground hover:no-underline py-4">
                <h3 className="text-left">{item.q}</h3>
              </AccordionTrigger>
              <AccordionContent className="text-sm font-mono text-muted-foreground leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default LandingFAQ;
