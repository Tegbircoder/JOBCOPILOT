import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import {
  Sparkles,
  KanbanSquare,
  Bell,
  UsersRound,
  BriefcaseBusiness,
  FileBarChart2,
  CalendarClock,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../lib/authStore";

/* ---------- small building blocks ---------- */
function Stat({ value, label }) {
  return (
    <div className="text-center p-6">
      <div className="text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="text-sm text-slate-600 mt-1">{label}</div>
    </div>
  );
}

function FeatureLink({ icon: Icon, title, sub, to = "/board" }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-100">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-slate-600">{sub}</div>
        </div>
      </div>
      <ArrowRight className="size-4 text-slate-400" />
    </Link>
  );
}

/* ---------- page ---------- */
export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-14">
      {/* ================= HEADER (with login button) ================= */}
      <header className="absolute top-0 right-0 p-4">
        {!user && (
          <Link to="/login">
            <Button variant="outline" size="sm" className="bg-white text-slate-900 border-slate-200 hover:bg-slate-50">
              Log in
            </Button>
          </Link>
        )}
      </header>

      {/* ================= HERO (solid blue gradient, very high contrast) ================= */}
      <section className="container rounded-3xl shadow-card overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white">
        <div className="grid md:grid-cols-2 gap-10 items-center px-6 py-16 md:px-12 md:py-20">
          {/* Left copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">
              <Sparkles className="size-3" />
              New: drag-and-drop job board
            </div>

            <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-tight">
              Learn faster with your best job search copilot.
            </h1>

            <p className="mt-4 text-white text-lg/7 max-w-xl">
              Organize applications, set reminders, and manage networking — all
              in one simple, beautiful workspace.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <Link to="/board">
                  <Button size="md" className="shadow-card">Go to my Board</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button size="md" className="shadow-card">Get started</Button>
                </Link>
              )}
              <a
                href="https://vitejs.dev"
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
              >
                <Button
                  variant="outline"
                  size="md"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                >
                  Learn more
                </Button>
              </a>
            </div>
          </div>

          {/* Right: stacked preview image (photo + board mock) */}
          <div className="w-full">
            <div className="relative mx-auto max-w-md">
              {/* main card */}
              <div className="rounded-2xl bg-white text-slate-900 shadow-card border border-slate-200 overflow-hidden">
                <img
                  className="w-full h-56 object-cover"
                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop"
                  alt="People collaborating"
                />
                <div className="p-4">
                  <div className="font-semibold">Preview of your board</div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-slate-200 rounded" />
                      <div className="h-16 rounded-xl bg-slate-100" />
                      <div className="h-16 rounded-xl bg-slate-100" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-slate-200 rounded" />
                      <div className="h-24 rounded-xl bg-slate-100" />
                      <div className="h-10 rounded-xl bg-slate-100" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-slate-200 rounded" />
                      <div className="h-10 rounded-xl bg-slate-100" />
                      <div className="h-24 rounded-xl bg-slate-100" />
                    </div>
                  </div>
                </div>
              </div>
              {/* subtle stacked layers */}
              <div className="absolute -z-10 left-6 right-6 top-6 h-[280px] rounded-2xl bg-white/25 backdrop-blur-sm border border-white/30 shadow-card" />
              <div className="absolute -z-20 left-12 right-12 top-12 h-[280px] rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-card" />
            </div>
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="container grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Stat value="100+" label="applications tracked" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Stat value="300+" label="smart reminders sent" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Stat value="120+" label="skills logged" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Stat value="4.8★" label="happy seekers rating" />
        </div>
      </section>

      {/* ================= QUICK FEATURE LINKS (like category tiles) ================= */}
      <section className="container">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureLink
            icon={KanbanSquare}
            title="Job board"
            sub="Track each application step"
          />
          <FeatureLink
            icon={BriefcaseBusiness}
            title="Applications"
            sub="Company, title, notes"
          />
          <FeatureLink
            icon={CalendarClock}
            title="Follow-ups"
            sub="Nudge yourself 2 / 7 / 14 days"
          />
          <FeatureLink
            icon={UsersRound}
            title="Networking"
            sub="Keep contacts tidy"
          />
          <FeatureLink
            icon={FileBarChart2}
            title="Dashboard"
            sub="Visualize your pipeline"
            to="/dashboard"
          />
          <FeatureLink
            icon={Bell}
            title="Reminders"
            sub="Email or in-app"
          />
        </div>
        <div className="mt-2">
          <Link to="/board" className="text-sm font-medium text-accent hover:underline">
            + See more
          </Link>
        </div>
      </section>

      {/* ================= PROGRESS SECTION ================= */}
      <section className="container grid md:grid-cols-2 gap-8 items-center">
        <div className="rounded-3xl overflow-hidden shadow-card border border-slate-200">
          <img
            className="w-full h-80 object-cover"
            src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop"
            alt="Focused working session"
          />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Progress starts with the right plan
          </h2>
          <p className="mt-3 text-slate-600">
            JobCopilot keeps you focused on the next action: save the job,
            apply, follow up, and prep for interviews—without losing track.
          </p>
          <ul className="mt-4 space-y-2 text-slate-700">
            <li>• One clean board for your whole search</li>
            <li>• One-click follow-ups with smart intervals</li>
            <li>• Notes, contacts, and documents in one place</li>
          </ul>
          <div className="mt-5">
            <Link to="/board">
              <Button>Try my board</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS (3 steps) ================= */}
      <section className="container">
        <h3 className="text-2xl font-extrabold tracking-tight mb-4">
          How JobCopilot works
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 text-sm font-semibold">1 — Find a job</div>
            <img
              className="w-full h-40 object-cover"
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"
              alt="Find jobs"
            />
            <div className="p-4 text-sm text-slate-600">
              Add it to “Saved”. When you apply, drag to “Applied”.
            </div>
          </div>
          {/* Step 2 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 text-sm font-semibold">2 — Stay on track</div>
            <img
              className="w-full h-40 object-cover"
              src="https://images.unsplash.com/photo-1551836022-4c4c79ecde51?q=80&w=1200&auto=format&fit=crop"
              alt="Stay on track"
            />
            <div className="p-4 text-sm text-slate-600">
              Set follow-ups for 2 / 7 / 14 days so nothing slips.
            </div>
          </div>
          {/* Step 3 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 text-sm font-semibold">3 — Win interviews</div>
            <img
              className="w-full h-40 object-cover"
              src="https://images.unsplash.com/photo-1529336953121-a453fae28f94?q=80&w=1200&auto=format&fit=crop"
              alt="Interview"
            />
            <div className="p-4 text-sm text-slate-600">
              Move cards through Screening → Interview → Final → Hired.
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROMO STRIP ================= */}
      <section className="container p-1 rounded-3xl border border-slate-900 bg-slate-900 shadow-card">
        <div className="rounded-3xl bg-gradient-to-r from-accentLight to-accent text-white p-8 md:p-12">
          <div className="grid md:grid-cols-2 items-center gap-6">
            <div>
              <h3 className="text-2xl font-extrabold">Supercharge your search</h3>
              <p className="mt-2 text-white/90">
                Unlock reminders, exports, and upcoming AI helpers.
              </p>
            </div>
            <div className="flex gap-3 md:justify-end">
              <Link to="/board">
                <Button size="md" className="shadow-card bg-white text-slate-900 hover:opacity-90">
                  Start free
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="md" className="border-white/60 text-white bg-white/10 hover:bg-white/20">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST / SECURITY + TEAMS ================= */}
      <section className="container grid md:grid-cols-2 gap-8 items-stretch">
        <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-card bg-white p-6">
          <h4 className="text-xl font-bold">For career centers & job clubs</h4>
          <p className="mt-2 text-slate-600">
            Help students and members track their searches in one place.
          </p>
          <ul className="mt-3 text-slate-700 text-sm space-y-1">
            <li>• Shared best-practice templates</li>
            <li>• Export progress summaries</li>
            <li>• Privacy-first, no spam</li>
          </ul>
          <div className="mt-4">
            <a
              href="https://images.unsplash.com/photo-1520975922324-24a76ddd56a2?q=80&w=1600&auto=format&fit=crop"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline text-sm"
            >
              View sample materials (image link)
            </a>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-card bg-white p-6">
          <h4 className="text-xl font-bold">Secure by design</h4>
          <p className="mt-2 text-slate-600">
            Your data stays yours. We use best-practice auth and storage.
          </p>
          <div className="mt-3 flex items-center gap-3 text-slate-700 text-sm">
            <ShieldCheck className="size-5 text-accent" />
            AWS Cognito authentication
          </div>
          <div className="mt-2 flex items-center gap-3 text-slate-700 text-sm">
            <FileBarChart2 className="size-5 text-accent" />
            Clean exports for applications and notes
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="container py-10 grid md:grid-cols-4 gap-6">
          <div>
            <div className="text-white font-bold">JobCopilot</div>
            <p className="mt-2 text-sm text-slate-400">
              Track your job hunt with confidence.
            </p>
          </div>
          <div>
            <div className="text-white font-semibold">Product</div>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link to="/board" className="hover:underline">Board</Link></li>
              <li><Link to="/dashboard" className="hover:underline">Dashboard</Link></li>
              <li><Link to="/settings" className="hover:underline">Settings</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-white font-semibold">Company</div>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a className="hover:underline" href="#">About</a></li>
              <li><a className="hover:underline" href="#">Contact</a></li>
              <li><a className="hover:underline" href="#">Privacy</a></li>
            </ul>
          </div>
          <div>
            <div className="text-white font-semibold">Resources</div>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <a
                  className="hover:underline"
                  href="https://images.unsplash.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Image sources
                </a>
              </li>
              <li><a className="hover:underline" href="https://vitejs.dev" target="_blank" rel="noreferrer">Tech</a></li>
              <li><a className="hover:underline" href="#">Changelog</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="container py-4 text-xs text-slate-500">
            © {new Date().getFullYear()} JobCopilot.
          </div>
        </div>
      </footer>
    </div>
  );
}