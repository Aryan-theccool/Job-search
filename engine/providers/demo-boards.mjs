// Built-in fallback dataset for offline/demo mode.
// Used by the seeder when public boards are unreachable (or for quick UI testing).
// Entries are representative public-style listings; they are ALWAYS flagged demo=true
// on the resulting jobs and real submission is blocked while profile.isDemo is true.

const GH = (token, slug, title, location, salary) => ({
  ats: 'greenhouse',
  token,
  title,
  url: `https://job-boards.greenhouse.io/${token}/${slug}`,
  location,
  salary,
  postedAt: undefined,
});

const LV = (token, slug, title, location) => ({
  ats: 'lever',
  token,
  title,
  url: `https://jobs.lever.co/${token}/${slug}`,
  location,
  salary: undefined,
  postedAt: undefined,
});

export const DEMO_BOARDS = [
  {
    name: 'Anthropic', ats: 'greenhouse', token: 'anthropic', careersUrl: 'https://www.anthropic.com/careers',
    jobs: [
      GH('anthropic', 'senior-ai-engineer-agent-reliability', 'Senior AI Engineer — Agent Reliability', 'San Francisco, CA (Hybrid)', { min: 210000, max: 280000, currency: 'USD' }),
      GH('anthropic', 'applied-ml-llm-evals', 'Applied ML Engineer — LLM Evaluation', 'Remote — US', { min: 185000, max: 240000, currency: 'USD' }),
      GH('anthropic', 'ai-solutions-architect-enterprise', 'AI Solutions Architect, Enterprise', 'New York, NY (Hybrid)', { min: 195000, max: 250000, currency: 'USD' }),
    ],
  },
  {
    name: 'Vercel', ats: 'greenhouse', token: 'vercel', careersUrl: 'https://vercel.com/careers',
    jobs: [
      GH('vercel', 'ai-platform-engineer', 'AI Platform Engineer', 'Remote — Americas', { min: 160000, max: 210000, currency: 'USD' }),
      GH('vercel', 'forward-deployed-engineer-ai', 'Forward Deployed Engineer — AI', 'San Francisco, CA (Hybrid)', { min: 200000, max: 260000, currency: 'USD' }),
      GH('vercel', 'developer-platform-senior', 'Senior Developer Platform Engineer', 'Remote — Global', { min: 150000, max: 195000, currency: 'USD' }),
    ],
  },
  {
    name: 'Airtable', ats: 'greenhouse', token: 'airtable', careersUrl: 'https://airtable.com/careers',
    jobs: [
      GH('airtable', 'product-engineer-ai-agents', 'Product Engineer — AI Agents', 'San Francisco, CA (Hybrid)', { min: 170000, max: 220000, currency: 'USD' }),
      GH('airtable', 'applied-scientist-llm', 'Applied Scientist — LLM', 'New York, NY (Hybrid)', { min: 190000, max: 245000, currency: 'USD' }),
    ],
  },
  {
    name: 'Temporal', ats: 'greenhouse', token: 'temporal', careersUrl: 'https://temporal.io/careers',
    jobs: [
      GH('temporal', 'solutions-architect-workflow-automation', 'Solutions Architect — Workflow Automation', 'Remote — US', { min: 165000, max: 215000, currency: 'USD' }),
      GH('temporal', 'ai-agent-orchestration-engineer', 'AI Agent Orchestration Engineer', 'Remote — Global', { min: 175000, max: 225000, currency: 'USD' }),
      GH('temporal', 'platform-software-engineer', 'Platform Software Engineer', 'San Francisco, CA (Hybrid)', { min: 160000, max: 205000, currency: 'USD' }),
    ],
  },
  {
    name: 'Arize AI', ats: 'greenhouse', token: 'arizeai', careersUrl: 'https://www.arize.com/careers',
    jobs: [
      GH('arizeai', 'llmops-platform-engineer', 'LLMOps Platform Engineer', 'Remote — US', { min: 160000, max: 205000, currency: 'USD' }),
      GH('arizeai', 'ai-observability-solutions-engineer', 'Solutions Engineer — AI Observability', 'Austin, TX (Hybrid)', { min: 140000, max: 180000, currency: 'USD' }),
    ],
  },
  {
    name: 'Glean', ats: 'greenhouse', token: 'gleanwork', careersUrl: 'https://www.glean.com/careers',
    jobs: [
      GH('gleanwork', 'ai-search-engineer', 'AI Search Engineer', 'San Francisco, CA (Hybrid)', { min: 185000, max: 240000, currency: 'USD' }),
      GH('gleanwork', 'enterprise-solutions-architect-ai', 'Enterprise Solutions Architect — AI', 'Remote — US', { min: 175000, max: 225000, currency: 'USD' }),
    ],
  },
  {
    name: 'Speechmatics', ats: 'greenhouse', token: 'speechmatics', careersUrl: 'https://speechmatics.com/company/careers',
    jobs: [
      GH('speechmatics', 'ml-engineer-speech', 'ML Engineer — Speech', 'London, UK (Hybrid)', { min: 85000, max: 110000, currency: 'GBP' }),
      GH('speechmatics', 'automation-engineer-platform', 'Automation Engineer — Platform', 'Remote — Global', { min: 95000, max: 120000, currency: 'GBP' }),
    ],
  },
  {
    name: 'PlanetScale', ats: 'greenhouse', token: 'planetscale', careersUrl: 'https://planetscale.com/careers',
    jobs: [
      GH('planetscale', 'staff-database-engineer-ai', 'Staff Database Engineer — AI Tooling', 'Remote — Americas', { min: 200000, max: 260000, currency: 'USD' }),
      GH('planetscale', 'developer-experience-engineer', 'Developer Experience Engineer', 'Remote — Global', { min: 155000, max: 200000, currency: 'USD' }),
    ],
  },
  {
    name: 'Hightouch', ats: 'greenhouse', token: 'hightouch', careersUrl: 'https://hightouch.com/careers',
    jobs: [
      GH('hightouch', 'solutions-engineer-data', 'Solutions Engineer — Data', 'Remote — US', { min: 140000, max: 185000, currency: 'USD' }),
      GH('hightouch', 'platform-engineer-cdc', 'Platform Engineer — Change Data Capture', 'Remote — Americas', { min: 160000, max: 205000, currency: 'USD' }),
    ],
  },
  {
    name: 'Runway', ats: 'greenhouse', token: 'runwayml', careersUrl: 'https://runwayml.com/careers',
    jobs: [
      GH('runwayml', 'applied-ml-researcher-video', 'Applied ML Researcher — Video Generation', 'New York, NY (Hybrid)', { min: 200000, max: 270000, currency: 'USD' }),
      GH('runwayml', 'creator-platform-engineer', 'Creator Platform Engineer', 'Remote — Global', { min: 150000, max: 195000, currency: 'USD' }),
    ],
  },
  {
    name: 'Wayve', ats: 'greenhouse', token: 'wayve', careersUrl: 'https://wayve.ai/jobs',
    jobs: [
      GH('wayve', 'ml-engineer-driving-models', 'ML Engineer — Driving Models', 'London, UK (Hybrid)', { min: 90000, max: 125000, currency: 'GBP' }),
      GH('wayve', 'simulation-automation-engineer', 'Simulation & Automation Engineer', 'London, UK (Hybrid)', { min: 80000, max: 105000, currency: 'GBP' }),
    ],
  },
  {
    name: 'Stability AI', ats: 'greenhouse', token: 'stabilityai', careersUrl: 'https://stability.ai/careers',
    jobs: [
      GH('stabilityai', 'generative-model-engineer', 'Generative Model Engineer', 'Remote — Global', { min: 120000, max: 160000, currency: 'USD' }),
      GH('stabilityai', 'ai-product-engineer', 'AI Product Engineer', 'Remote — Europe', { min: 95000, max: 130000, currency: 'USD' }),
    ],
  },
  {
    name: 'Mistral', ats: 'lever', token: 'mistral', careersUrl: 'https://mistral.ai/careers',
    jobs: [
      LV('mistral', 'staff-llm-engineer', 'Staff LLM Engineer'),
      LV('mistral', 'ai-platform-engineer-inference', 'AI Platform Engineer — Inference'),
      LV('mistral', 'applied-research-engineer-enterprise', 'Applied Research Engineer, Enterprise'),
    ],
  },
  {
    name: 'Spotify', ats: 'lever', token: 'spotify', careersUrl: 'https://lifeatspotify.com/',
    jobs: [
      LV('spotify', 'senior-machine-learning-engineer-personalization', 'Senior Machine Learning Engineer — Personalization'),
      LV('spotify', 'ai-assistant-software-engineer', 'AI Assistant Software Engineer'),
      LV('spotify', 'data-platform-engineer', 'Data Platform Engineer'),
    ],
  },
];

/** Flattened list of all demo postings. */
export function allDemoJobs() {
  const out = [];
  for (const board of DEMO_BOARDS) {
    for (const job of board.jobs) {
      out.push({ ...job, company: board.name });
    }
  }
  return out;
}
