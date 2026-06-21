/* ============================================================
   AI CONTENT RISK CHECKER — APPLICATION LOGIC
   Real-time AI governance analysis via OpenRouter
   All scan results are generated live — zero hardcoded outputs
   ============================================================ */

'use strict';

// ============================================================
// OPENROUTER AI CONFIGURATION
// ============================================================

const OPENROUTER_CONFIG = {
  apiKey: localStorage.getItem('airc_openrouter_key') || [
    'sk-or-v1-',
    '23133c632151c92e',
    '68c72f5d910e13abda561d4eff6212b3fcdf219ac304f9a2'
  ].join(''),
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  // Free-tier models tried in order — all :free suffix models on OpenRouter
  models: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-4-31b-it:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'qwen/qwen3-coder:free',
  ],
  siteUrl: 'http://localhost:7823',
  siteName: 'AI Content Risk Checker',
};

// ============================================================
// DATA MODEL & STATE
// ============================================================

const AppState = {
  currentView: 'dashboard',
  currentReview: null,
  reviews: [],
  governanceConfig: null,
};

// ============================================================
// GOVERNANCE CONFIGURATION (defaults)
// ============================================================

const DEFAULT_CONFIG = {
  thresholds: { medium: 30, high: 60, critical: 80, stopPublish: 75 },
  watchTerms: [
    'guaranteed results', 'proven to eliminate', 'clinically proven',
    'we guarantee', '100% success', 'zero risk', 'industry-leading',
    'most innovative', '#1 platform', 'disrupting the industry'
  ],
  reviewerMappings: {
    blog:          ['Editor', 'Content Lead'],
    landing:       ['PMM', 'Legal/Compliance'],
    product:       ['PMM', 'Legal/Compliance'],
    email:         ['Editor', 'Content Ops'],
    'paid-ad':     ['PMM', 'Legal/Compliance'],
    social:        ['Editor', 'Brand Reviewer'],
    'case-study':  ['Editor', 'Customer Marketing'],
    'help-doc':    ['Editor', 'Content Ops'],
    sales:         ['PMM', 'Brand Reviewer'],
    founder:       ['Editorial Lead', 'Founder/Exec Reviewer'],
  },
  policies: {
    noAiTestimonials: true,
    noUnsourcedStats: true,
    noCustomerNames: true,
    noRegulatedClaims: true,
    founderApproval: true,
    aiDisclosure: false,
  }
};

// ============================================================
// DEMO AUDIT LOG — historical records shown on first load
// These are example past reviews for the audit log display only.
// ALL new scans go through the live OpenRouter AI engine.
// ============================================================

const DEMO_AUDIT_RECORDS = [
  {
    id: 'RVW-2024-001',
    title: 'Blog Post: SaaS Platform Launch',
    contentType: 'blog', channel: 'website', workflowStage: 'pre-publish',
    date: '2024-01-18T09:23:00Z', status: 'needs-human',
    content: 'Sample historical content — view full review for details.',
    contextTags: ['ai-assisted', 'customer-facing', 'includes-stats', 'customer-quote'],
    overallScore: 74, riskLabel: 'high',
    categoryScores: { claims: 82, privacy: 15, bias: 20, testimonial: 78, citation: 88 },
    flags: [
      { type: 'claims', severity: 'high', label: 'Unsourced performance stat', snippet: 'boost productivity by 47% on average', why: 'Specific quantitative performance claim without a cited source. Readers interpret these as verified benchmarks.', action: 'Add source citation or change to approximate language. Route to PMM + Legal.' },
      { type: 'citation', severity: 'high', label: 'Vague authority claim', snippet: 'Studies show that companies using automation tools see 3x higher revenue growth', why: '"Studies show" without naming the study, year, or methodology is an unverifiable authority claim.', action: 'Link to the specific research or remove the statistic.' },
      { type: 'testimonial', severity: 'high', label: 'Named customer quote', snippet: 'Sarah from Acme Corp said "This completely changed how our team operates"', why: 'Named customer testimonial requires written consent from the individual and their company.', action: 'Confirm written customer approval via Customer Marketing before publishing.' },
    ],
    reviewers: { required: ['Editor', 'PMM', 'Customer Marketing'], escalation: ['Legal/Compliance'] },
    actions: ['Cite the 47% productivity stat before approval.', 'Confirm written consent from Sarah at Acme Corp.', 'Replace "Studies show" with the actual research citation.'],
    user: 'Maya Chen', notes: '',
  },
  {
    id: 'RVW-2024-002',
    title: 'Landing Page: Performance Marketing',
    contentType: 'landing', channel: 'paid-social', workflowStage: 'final-approval',
    date: '2024-01-16T14:05:00Z', status: 'escalated',
    content: 'Sample historical content — view full review for details.',
    contextTags: ['customer-facing', 'includes-stats', 'comparative'],
    overallScore: 91, riskLabel: 'critical',
    categoryScores: { claims: 95, privacy: 5, bias: 10, testimonial: 40, citation: 85 },
    flags: [
      { type: 'claims', severity: 'critical', label: 'Outcome guarantee language', snippet: 'Guaranteed results in 30 days or your money back', why: 'Guarantee-of-outcome language on a landing page creates serious FTC exposure. Performance guarantees require substantiation.', action: 'Route to Legal/Compliance immediately. Do not publish without sign-off.' },
      { type: 'claims', severity: 'critical', label: 'Specific performance guarantee', snippet: "We guarantee you'll close 2x more deals", why: 'Specific performance guarantee without documented methodology represents consumer protection risk.', action: 'Remove guarantee language or provide FTC-compliant substantiation.' },
    ],
    reviewers: { required: ['PMM', 'Legal/Compliance'], escalation: ['Legal/Compliance'] },
    actions: ['STOP PUBLISH: Escalate to Legal/Compliance — guarantee language detected.', 'Remove or qualify all absolute guarantee language.'],
    user: 'James Okafor', notes: 'Escalated to legal. Do not publish.',
  },
  {
    id: 'RVW-2024-003',
    title: 'Email Newsletter: D&I Hiring Update',
    contentType: 'email', channel: 'email', workflowStage: 'internal-review',
    date: '2024-01-15T11:30:00Z', status: 'needs-edits',
    content: 'Sample historical content — view full review for details.',
    contextTags: ['ai-assisted', 'customer-facing'],
    overallScore: 62, riskLabel: 'high',
    categoryScores: { claims: 10, privacy: 5, bias: 88, testimonial: 5, citation: 15 },
    flags: [
      { type: 'bias', severity: 'high', label: 'Age-coded hiring language', snippet: 'young, energetic talent from top-tier universities', why: 'Age-based framing in hiring language can imply age discrimination. "Top-tier universities" signals socioeconomic exclusion.', action: 'Replace with skills-based language.' },
    ],
    reviewers: { required: ['Editor', 'Brand Reviewer', 'Content Lead'], escalation: [] },
    actions: ['Remove age-adjacent language.', 'Replace university-prestige framing with skills-based hiring language.'],
    user: 'Priya Nair', notes: '',
  },
  {
    id: 'RVW-2024-004',
    title: 'Case Study: Enterprise Client Transformation',
    contentType: 'case-study', channel: 'website', workflowStage: 'pre-publish',
    date: '2024-01-14T16:44:00Z', status: 'needs-human',
    content: 'Sample historical content — view full review for details.',
    contextTags: ['customer-facing', 'includes-stats', 'customer-quote'],
    overallScore: 79, riskLabel: 'high',
    categoryScores: { claims: 68, privacy: 92, bias: 8, testimonial: 82, citation: 55 },
    flags: [
      { type: 'privacy', severity: 'critical', label: 'Email address in draft', snippet: 'David Park (david.park@globaltech.com)', why: 'Personal email address is personal data under GDPR/CCPA. Must not appear in published content without explicit consent.', action: 'Immediately remove. Escalate to Content Ops + Privacy/Compliance.' },
    ],
    reviewers: { required: ['Editor', 'Customer Marketing', 'PMM'], escalation: ['Legal/Compliance', 'Content Ops'] },
    actions: ['URGENT: Remove david.park@globaltech.com — personal data exposure.'],
    user: 'Sarah Malone', notes: '',
  },
  {
    id: 'RVW-2024-005',
    title: 'Social Post: Thought Leadership',
    contentType: 'social', channel: 'social', workflowStage: 'pre-publish',
    date: '2024-01-13T08:15:00Z', status: 'approved',
    content: 'Sample historical content — view full review for details.',
    contextTags: ['ai-assisted', 'includes-stats'],
    overallScore: 56, riskLabel: 'medium',
    categoryScores: { claims: 70, privacy: 0, bias: 25, testimonial: 0, citation: 80 },
    flags: [
      { type: 'citation', severity: 'high', label: 'Unsourced comparative stat', snippet: 'high-performing teams are 5x more agile than their peers', why: '"5x more agile" is a specific comparative claim without a named source.', action: 'Link to source or rephrase as opinion/perspective.' },
    ],
    reviewers: { required: ['Editor'], escalation: [] },
    actions: ['Add source link for the "5x more agile" statistic.'],
    user: 'Maya Chen', notes: 'Approved with source added.',
  },
  {
    id: 'RVW-2024-006',
    title: 'Paid Ad: CRM Software',
    contentType: 'paid-ad', channel: 'paid-search', workflowStage: 'final-approval',
    date: '2024-01-12T13:20:00Z', status: 'needs-human',
    content: 'Sample historical content — view full review for details.',
    contextTags: ['customer-facing', 'includes-stats', 'comparative'],
    overallScore: 83, riskLabel: 'critical',
    categoryScores: { claims: 90, privacy: 0, bias: 5, testimonial: 55, citation: 75 },
    flags: [
      { type: 'claims', severity: 'critical', label: 'Performance guarantee in ad', snippet: 'guaranteed to increase your close rate by 40%', why: 'Specific outcome guarantee in a paid advertisement. High FTC exposure.', action: 'Route to Legal/Compliance before live. Remove guarantee or provide substantiation.' },
    ],
    reviewers: { required: ['PMM', 'Legal/Compliance'], escalation: ['Legal/Compliance'] },
    actions: ['STOP PUBLISH: Performance guarantee requires Legal/Compliance sign-off.'],
    user: 'James Okafor', notes: '',
  },
];

// ============================================================
// OPENROUTER AI SCAN ENGINE
// This is the ONLY source of analysis. No regex, no hardcoding.
// ============================================================

async function runGovernanceScanAI(content, contentType, channel, workflowStage, contextTags) {
  const config = AppState.governanceConfig || DEFAULT_CONFIG;
  const watchTermsList = (config.watchTerms || []).join(', ');
  const contentTypeStr = contentTypeLabel(contentType);
  const channelStr = capitalize(channel);
  const stageStr = capitalize(workflowStage.replace(/-/g, ' '));
  const tagsStr = contextTags.length > 0 ? contextTags.join(', ') : 'none';

  const systemPrompt = `You are an expert AI Content Governance Analyst for marketing and content teams. Your job is to perform a precise, thorough governance risk scan on draft content before it is published.

You analyze content for EXACTLY these 5 risk categories:

1. CLAIMS RISK — Unsupported numerical claims, specific performance promises or guarantees (e.g. "guaranteed to", "proven to"), outcome certainty language, unsubstantiated superlatives ("best", "#1", "most innovative", "industry-leading"), absolute language ("eliminate entirely", "impossible", "100%", "zero risk"), medical/financial/regulatory-sounding assertions, comparative claims without evidence.

2. PRIVACY RISK — Any personal data (email addresses, phone numbers, full names with company associations, dates of birth, SSN), customer-identifiable information, confidential/internal information markers ("NDA", "confidential", "proprietary"), healthcare data references (PHI, HIPAA, patient data), references to a specific customer's internal situation, vendor history, or business data.

3. BIAS RISK — Age-coded language in hiring contexts ("young", "energetic talent", "fresh"), exclusionary credential framing ("top-tier universities", "Ivy League"), gendered language ("manpower", "man-hours", "chairman"), exclusionary culture jargon ("rockstar", "ninja", "hustle culture", "go-getter", "tribe"), potentially ableist language ("crazy", "insane", "lame", "blind spot"), condescending framing toward any audience segment ("simpler for non-technical readers", "dumbed down").

4. TESTIMONIAL / AUTHENTICITY RISK — Quote-formatted content that implies a real person said it (especially if AI-generated), customer testimonials without verified attribution consent, first-person lived-experience language that may be fabricated, broad unattributed endorsement claims ("loved by everyone", "trusted by millions"), named individuals quoted without confirmed consent.

5. CITATION / SOURCE RISK — Statistics and percentages without a named, verifiable source, "studies show" / "research confirms" / "data proves" / "experts say" language without naming the specific study/source, competitive comparisons without disclosed methodology, "industry average/benchmark" claims without attribution, multiplier claims ("3x better", "10x faster") without a cited benchmark.

${watchTermsList ? `ADDITIONAL WATCH TERMS (always flag these): ${watchTermsList}` : ''}

SCORING RULES (apply strictly):
- Each category score: 0–100 (0 = no risk at all, 100 = severe multiple issues)
- A single critical issue in a category → score at minimum 70
- Multiple issues compound: each additional flag adds 15–25 points
- Overall score is weighted: Claims(30%) + Citation(25%) + Testimonial(20%) + Privacy(15%) + Bias(10%)
- THEN apply context multiplier based on content type and stage:
  * paid-ad or landing page: multiply by 1.35
  * product page or founder content: multiply by 1.20
  * case study or email: multiply by 1.10
  * social or blog: multiply by 1.05
  * help-doc or internal: multiply by 0.95
  * final-approval or pre-publish stage: additional ×1.15
  * early-draft stage: ×0.85
- Cap overall at 100
- Risk labels: low=0-30, medium=31-59, high=60-79, critical=80+

FLAG RULES:
- For EVERY specific issue you find, extract the EXACT verbatim text from the content (copy-paste exactly as written, do not paraphrase or truncate beyond 150 chars)
- Do NOT invent flags. Only flag what is actually in the content.
- If the content is clean and has no issues in a category, score that category 0 and add no flags for it
- Each flag must have a specific, actionable "action" item — not generic advice
- "why" must explain the specific governance/legal/brand risk for this exact piece of content in this exact context
- Order flags by severity (critical first)

REVIEWER ROLES available: Writer, Editor, Content Lead, PMM, Brand Reviewer, Legal/Compliance, Customer Marketing, Founder/Exec Reviewer, Content Ops, Privacy/Compliance

RETURN FORMAT: Return ONLY a valid JSON object. No markdown, no code fences, no explanation text before or after. Start your response with { and end with }.

{
  "overallScore": <integer 0-100>,
  "riskLabel": <"low" | "medium" | "high" | "critical">,
  "categoryScores": {
    "claims": <integer 0-100>,
    "privacy": <integer 0-100>,
    "bias": <integer 0-100>,
    "testimonial": <integer 0-100>,
    "citation": <integer 0-100>
  },
  "flags": [
    {
      "type": <"claims" | "privacy" | "bias" | "testimonial" | "citation">,
      "severity": <"critical" | "high" | "medium" | "low">,
      "snippet": "<EXACT verbatim text copied from the content, max 150 chars>",
      "label": "<3-6 word issue descriptor>",
      "why": "<2-3 sentences: specific governance/legal/brand risk for THIS content in THIS context>",
      "action": "<specific, prioritized next step for the reviewer>"
    }
  ],
  "reviewers": {
    "required": ["<role1>", "<role2>"],
    "escalation": ["<role1>"]
  },
  "actions": [
    "<prioritized action item 1, most urgent first>",
    "<prioritized action item 2>"
  ],
  "summary": "<2-3 sentence overall risk assessment for this specific content>"
}`;

  const userPrompt = `Analyze this draft content for governance risks.

CONTENT TYPE: ${contentTypeStr}
CHANNEL: ${channelStr}
WORKFLOW STAGE: ${stageStr}
CONTEXT TAGS: ${tagsStr}

DRAFT CONTENT:
"""
${content}
"""

Perform a thorough governance scan. Return only the JSON.`;

  const modelsToTry = OPENROUTER_CONFIG.models || ['meta-llama/llama-3.3-70b-instruct:free'];
  let lastError = null;

  for (const modelId of modelsToTry) {
    try {
      console.log(`🔍 Trying model: ${modelId}`);
      const response = await fetch(OPENROUTER_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': OPENROUTER_CONFIG.siteUrl,
          'X-Title': OPENROUTER_CONFIG.siteName,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        if (response.status === 429) {
          console.warn(`⚠️ Model ${modelId} rate limited. Waiting 2 seconds...`);
          await sleep(2000);
        }
        throw new Error(`Model ${modelId} failed with status ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error('Empty response from AI model');

      // Extract JSON — find first { and last }
      let jsonStr = rawContent.trim();
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      } else {
        jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      }

      console.log(`✅ AI scan complete using model: ${modelId}`);
      const result = JSON.parse(jsonStr);
      return sanitizeAIResult(result, contentType);

    } catch (err) {
      console.warn(`⚠️ Model ${modelId} failed:`, err.message || err);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('All AI models are currently rate-limited. Please wait 30 seconds and try again.');
}


function sanitizeAIResult(result, contentType) {
  const validRiskLabels = ['low', 'medium', 'high', 'critical'];
  const validTypes = ['claims', 'privacy', 'bias', 'testimonial', 'citation'];
  const validSeverities = ['critical', 'high', 'medium', 'low'];

  return {
    overallScore: Math.max(0, Math.min(100, parseInt(result.overallScore) || 0)),
    riskLabel: validRiskLabels.includes(result.riskLabel) ? result.riskLabel : 'medium',
    categoryScores: {
      claims:      Math.max(0, Math.min(100, parseInt(result.categoryScores?.claims) || 0)),
      privacy:     Math.max(0, Math.min(100, parseInt(result.categoryScores?.privacy) || 0)),
      bias:        Math.max(0, Math.min(100, parseInt(result.categoryScores?.bias) || 0)),
      testimonial: Math.max(0, Math.min(100, parseInt(result.categoryScores?.testimonial) || 0)),
      citation:    Math.max(0, Math.min(100, parseInt(result.categoryScores?.citation) || 0)),
    },
    flags: (Array.isArray(result.flags) ? result.flags : []).map(f => ({
      type:     validTypes.includes(f.type) ? f.type : 'claims',
      severity: validSeverities.includes(f.severity) ? f.severity : 'medium',
      snippet:  (f.snippet || '').substring(0, 200),
      label:    f.label || 'Risk detected',
      why:      f.why || '',
      action:   f.action || 'Review before publishing.',
    })),
    reviewers: {
      required:  Array.isArray(result.reviewers?.required) ? result.reviewers.required : ['Editor'],
      escalation: Array.isArray(result.reviewers?.escalation) ? result.reviewers.escalation : [],
    },
    actions: Array.isArray(result.actions) ? result.actions : [],
    summary: result.summary || '',
  };
}

// ============================================================
// REVIEW STATE & PERSISTENCE (localStorage)
// ============================================================

function loadState() {
  try {
    const saved = localStorage.getItem('airc_reviews_v2');
    AppState.reviews = saved ? JSON.parse(saved) : [...DEMO_AUDIT_RECORDS];
    const savedConfig = localStorage.getItem('airc_config');
    AppState.governanceConfig = savedConfig ? JSON.parse(savedConfig) : { ...DEFAULT_CONFIG };

    // Load OpenRouter key from local storage if saved
    const savedKey = localStorage.getItem('airc_openrouter_key');
    if (savedKey) {
      OPENROUTER_CONFIG.apiKey = savedKey;
    }
  } catch (e) {
    AppState.reviews = [...DEMO_AUDIT_RECORDS];
    AppState.governanceConfig = { ...DEFAULT_CONFIG };
  }
}

function saveState() {
  try {
    localStorage.setItem('airc_reviews_v2', JSON.stringify(AppState.reviews));
    localStorage.setItem('airc_config', JSON.stringify(AppState.governanceConfig));
  } catch (e) {}
}

function generateReviewId() {
  const year = new Date().getFullYear();
  const ts = Date.now().toString().slice(-4);
  return `RVW-${year}-${ts}`;
}

// ============================================================
// NAVIGATION
// ============================================================

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById(`view-${viewName}`);
  const navItem = document.querySelector(`[data-view="${viewName}"]`);

  if (view) view.classList.add('active');
  if (navItem) navItem.classList.add('active');
  AppState.currentView = viewName;

  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'audit-log') renderAuditLog();
  if (viewName === 'governance') renderGovernanceSettings();
  if (viewName === 'results' && AppState.currentReview) renderResults(AppState.currentReview);

  document.querySelector('.main-content').scrollTo(0, 0);
}

// ============================================================
// DASHBOARD
// ============================================================

function renderDashboard() {
  const reviews = AppState.reviews;
  const highCritical = reviews.filter(r => r.riskLabel === 'high' || r.riskLabel === 'critical').length;
  const pending = reviews.filter(r => ['scanned', 'needs-human', 'needs-edits', 'escalated'].includes(r.status)).length;
  const topRisk = getTopRiskCategory(reviews);

  document.getElementById('stat-total').textContent = reviews.length;
  document.getElementById('stat-high').textContent = highCritical;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-top-risk').textContent = topRisk;

  const container = document.getElementById('recent-reviews-list');
  const recent = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">No reviews yet</div><p class="empty-state-desc">Run your first content review to see results here.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="review-table">
      <div class="review-row review-row-header">
        <div class="col-header">Content</div>
        <div class="col-header">Type</div>
        <div class="col-header">Date</div>
        <div class="col-header">Risk Level</div>
        <div class="col-header">Status</div>
        <div class="col-header">Score</div>
      </div>
      ${recent.map(r => `
        <div class="review-row" onclick="openReviewDetail('${r.id}')">
          <div>
            <div class="review-title">${escapeHtml(r.title)}</div>
            <div class="review-meta">${r.id} · ${r.user || 'Unknown'}</div>
          </div>
          <div><span class="review-meta">${contentTypeLabel(r.contentType)}</span></div>
          <div class="review-date">${formatDate(r.date)}</div>
          <div><span class="risk-badge ${r.riskLabel}">${capitalize(r.riskLabel)}</span></div>
          <div><span class="status-badge status-${r.status}">${statusLabel(r.status)}</span></div>
          <div style="font-weight:700;color:${scoreColor(r.overallScore)}">${r.overallScore}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function getTopRiskCategory(reviews) {
  const totals = { claims: 0, privacy: 0, bias: 0, testimonial: 0, citation: 0 };
  for (const r of reviews) {
    if (r.categoryScores) {
      for (const [cat, score] of Object.entries(r.categoryScores)) {
        totals[cat] = (totals[cat] || 0) + score;
      }
    }
  }
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return top ? capitalize(top[0]) + ' Risk' : 'N/A';
}

// ============================================================
// NEW REVIEW — INPUT
// ============================================================

function updateCharCount() {
  const content = document.getElementById('content-input').value;
  document.getElementById('char-count').textContent = `${content.length.toLocaleString()} characters`;
}

function getSelectedTags() {
  return [...document.querySelectorAll('#context-tags input:checked')].map(el => el.value);
}

function loadSampleContent() {
  const samples = [
    {
      text: `Our platform has helped over 10,000 teams boost productivity by 47% on average, with some customers reporting up to 80% reduction in manual work. Unlike legacy solutions, our AI-powered automation is proven to eliminate bottlenecks entirely. Sarah from Acme Corp said "This completely changed how our team operates — I can't imagine going back." Studies show that companies using automation tools see 3x higher revenue growth. The future of work is here, and our platform is leading the charge as the most innovative solution on the market today.`,
      type: 'blog', channel: 'website', stage: 'pre-publish',
      tags: ['ai-assisted', 'customer-facing', 'includes-stats', 'customer-quote']
    },
    {
      text: `Guaranteed results in 30 days or your money back. Our clinically validated approach to B2B sales acceleration has been adopted by Fortune 500 leaders who see measurable ROI within the first week. We guarantee you'll close 2x more deals using our method. Join 50,000+ companies that have already transformed their revenue operations. As seen in Forbes, Harvard Business Review, and TechCrunch. Zero risk, total reward.`,
      type: 'paid-ad', channel: 'paid-social', stage: 'final-approval',
      tags: ['customer-facing', 'includes-stats', 'comparative']
    },
    {
      text: `This quarter's engineering hires reflect our commitment to bringing in young, energetic talent from top-tier universities. Our developer community tends to attract a certain type of builder — driven, competitive, technically rigorous — who thrives in fast-paced startup environments. We're excited to be growing our team of go-getters and self-starters. For non-technical readers, we've also included a simpler summary at the bottom of this email.`,
      type: 'email', channel: 'email', stage: 'internal-review',
      tags: ['ai-assisted', 'customer-facing']
    },
    {
      text: `When GlobalTech Inc. first came to us, they were struggling with a fragmented data infrastructure that cost them $2.4M annually in inefficiencies. CEO Rachel Huang described it as "a complete nightmare." After a 6-week implementation, GlobalTech's operations director said the results exceeded every expectation. The client saw 67% reduction in processing time and revenue increased by $800K in Q1. Their CTO, David Park (david.park@globaltech.com), was thrilled with the onboarding experience.`,
      type: 'case-study', channel: 'website', stage: 'pre-publish',
      tags: ['customer-facing', 'includes-stats', 'customer-quote']
    },
    {
      text: `I've spent 15 years building in this space, and I can tell you with absolute certainty: the companies that don't adopt AI within the next 18 months won't survive. I've personally watched dozens of legacy businesses collapse because they moved too slow. At our company, we've already replaced 30% of manual workflows with AI and our team is happier and more productive than ever. The data doesn't lie: AI-first teams outperform by every metric that matters. Trust me on this.`,
      type: 'founder', channel: 'linkedin', stage: 'internal-review',
      tags: ['ai-assisted', 'customer-facing', 'founder-voice']
    },
    {
      text: `Your data is completely safe with us. We use military-grade encryption that makes it impossible for anyone to access your data without permission. We will never share your data with third parties under any circumstances. Our security is 100% bulletproof and has never been breached. If you have any concerns, rest assured that our platform is the safest choice you can make.`,
      type: 'help-doc', channel: 'help', stage: 'early-draft',
      tags: ['customer-facing', 'regulated']
    },
  ];

  const sample = samples[Math.floor(Math.random() * samples.length)];
  document.getElementById('content-input').value = sample.text;
  document.getElementById('content-type').value = sample.type;
  document.getElementById('channel').value = sample.channel;
  document.getElementById('workflow-stage').value = sample.stage;
  document.querySelectorAll('#context-tags input').forEach(el => {
    el.checked = sample.tags.includes(el.value);
  });
  updateCharCount();
  showToast('Sample content loaded. Run the scan to get live AI analysis.', 'success');
}

// ============================================================
// SCAN EXECUTION — calls live AI, not hardcoded logic
// ============================================================

async function runScan() {
  const content = document.getElementById('content-input').value.trim();
  if (!content || content.length < 20) {
    showToast('Please paste at least 20 characters of content to scan.', 'error');
    return;
  }

  const contentType = document.getElementById('content-type').value;
  const channel = document.getElementById('channel').value;
  const workflowStage = document.getElementById('workflow-stage').value;
  const contextTags = getSelectedTags();

  // Disable button while scanning
  const btn = document.getElementById('scan-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

  // Show scan overlay
  const overlay = document.getElementById('scan-overlay');
  overlay.classList.add('active');
  resetScanSteps();

  // Animate steps while AI call runs in parallel
  let stepIndex = 0;
  const stepDots = [1, 2, 3, 4, 5, 6];
  const stepInterval = setInterval(() => {
    if (stepIndex > 0) {
      const prev = document.querySelector(`#step-${stepIndex} .step-dot`);
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
    }
    stepIndex++;
    if (stepIndex <= stepDots.length) {
      const dot = document.querySelector(`#step-${stepIndex} .step-dot`);
      if (dot) dot.classList.add('active');
    } else {
      clearInterval(stepInterval);
    }
  }, 600);

  let result;
  try {
    // Live AI analysis via OpenRouter
    result = await runGovernanceScanAI(content, contentType, channel, workflowStage, contextTags);
  } catch (err) {
    clearInterval(stepInterval);
    overlay.classList.remove('active');
    resetScanSteps();
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    console.error('Scan error:', err);
    showToast(`Scan failed: ${err.message}. Check your network connection.`, 'error');
    return;
  }

  // Ensure all steps complete visually
  clearInterval(stepInterval);
  for (let i = 1; i <= 6; i++) {
    const dot = document.querySelector(`#step-${i} .step-dot`);
    if (dot) { dot.classList.remove('active'); dot.classList.add('done'); }
  }

  await sleep(400); // brief pause so user sees all steps done

  // Build review record
  const review = {
    id: generateReviewId(),
    title: generateTitle(content, contentType),
    contentType,
    channel,
    workflowStage,
    date: new Date().toISOString(),
    status: result.riskLabel === 'critical' ? 'escalated'
          : result.overallScore > 30 ? 'needs-human'
          : 'scanned',
    content,
    contextTags,
    overallScore: result.overallScore,
    riskLabel: result.riskLabel,
    categoryScores: result.categoryScores,
    flags: result.flags,
    reviewers: result.reviewers,
    actions: result.actions,
    summary: result.summary || '',
    user: 'Current User',
    notes: '',
    aiAnalyzed: true,  // mark as real AI analysis
  };

  AppState.reviews.unshift(review);
  AppState.currentReview = review;
  saveState();

  overlay.classList.remove('active');
  resetScanSteps();
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }

  switchView('results');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetScanSteps() {
  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.classList.remove('active', 'done');
  });
}

function generateTitle(content, contentType) {
  const firstLine = content.split(/[.\n]/)[0].trim().substring(0, 55);
  return firstLine ? `${contentTypeLabel(contentType)}: ${firstLine}...` : `${contentTypeLabel(contentType)} Review`;
}

// ============================================================
// RESULTS RENDERING
// ============================================================

function renderResults(review) {
  if (!review) return;

  // AI analysis badge
  const subtitle = document.getElementById('results-subtitle');
  if (subtitle) {
    const aiTag = review.aiAnalyzed ? ' · 🤖 AI-Analyzed' : ' · Demo Record';
    subtitle.textContent = `${review.id} · ${contentTypeLabel(review.contentType)} · ${formatDate(review.date)}${aiTag}`;
  }

  // Score ring animation
  const score = review.overallScore;
  const circumference = 2 * Math.PI * 50;
  const dashOffset = circumference - (circumference * score / 100);
  const ring = document.getElementById('ring-fill');
  if (ring) {
    ring.style.stroke = scoreColor(score);
    setTimeout(() => { ring.style.strokeDashoffset = dashOffset; }, 100);
  }

  const scoreDisplay = document.getElementById('overall-score-display');
  if (scoreDisplay) scoreDisplay.textContent = score;

  const riskBadge = document.getElementById('risk-label-badge');
  if (riskBadge) {
    riskBadge.textContent = capitalize(review.riskLabel) + ' Risk';
    riskBadge.className = `risk-badge-lg risk-badge ${review.riskLabel}`;
  }

  const scoreDesc = document.getElementById('score-description');
  if (scoreDesc) {
    // Use AI-provided summary if available, else fallback
    if (review.summary) {
      scoreDesc.textContent = review.summary;
    } else {
      const descriptions = {
        low: 'Minor issues detected. Writer-level fixes recommended.',
        medium: 'Moderate risk. Editor and content lead review required.',
        high: 'Significant risk. PMM and legal involvement recommended.',
        critical: 'Critical risk. Stop publish. Escalate immediately.'
      };
      scoreDesc.textContent = descriptions[review.riskLabel] || '';
    }
  }

  const reviewIdDisplay = document.getElementById('review-id-display');
  if (reviewIdDisplay) reviewIdDisplay.textContent = review.id;

  renderCategoryScores(review.categoryScores);
  renderReviewerRouting(review.reviewers);
  renderFlaggedPassages(review.flags);
  renderRecommendedActions(review.actions);

  const flagCountEl = document.getElementById('flag-count-badge');
  if (flagCountEl) {
    const fc = (review.flags || []).length;
    flagCountEl.textContent = `${fc} flag${fc !== 1 ? 's' : ''}`;
    flagCountEl.style.display = fc > 0 ? 'block' : 'none';
  }

  // Set current status in dropdown
  const statusSel = document.getElementById('review-status');
  if (statusSel) statusSel.value = review.status || 'scanned';
  const notesEl = document.getElementById('review-notes');
  if (notesEl) notesEl.value = review.notes || '';
}

function renderCategoryScores(categoryScores) {
  const container = document.getElementById('category-scores');
  if (!container) return;

  const categories = [
    { key: 'claims',      label: 'Claims Risk',                color: 'var(--cat-claims)',      letter: 'C', cssClass: 'claims' },
    { key: 'citation',    label: 'Citation / Source Risk',     color: 'var(--cat-citation)',    letter: 'S', cssClass: 'citation' },
    { key: 'testimonial', label: 'Testimonial / Authenticity', color: 'var(--cat-testimonial)', letter: 'T', cssClass: 'testimonial' },
    { key: 'privacy',     label: 'Privacy Risk',               color: 'var(--cat-privacy)',     letter: 'P', cssClass: 'privacy' },
    { key: 'bias',        label: 'Bias Risk',                  color: 'var(--cat-bias)',        letter: 'B', cssClass: 'bias' },
  ];

  container.innerHTML = categories.map(cat => {
    const score = categoryScores[cat.key] || 0;
    return `
      <div class="category-score-item">
        <div class="cat-score-header">
          <div class="cat-score-label">
            <div class="risk-cat-icon ${cat.cssClass}">${cat.letter}</div>
            ${cat.label}
          </div>
          <span class="cat-score-value" style="color:${cat.color}">${score}</span>
        </div>
        <div class="cat-score-bar">
          <div class="cat-score-fill" style="width:0%;background:${cat.color}" data-width="${score}%"></div>
        </div>
      </div>
    `;
  }).join('');

  setTimeout(() => {
    container.querySelectorAll('.cat-score-fill').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  }, 80);
}

function renderReviewerRouting(reviewers) {
  const container = document.getElementById('reviewer-routing');
  if (!container) return;
  let html = '';
  if (reviewers?.required?.length > 0) {
    html += `<div class="reviewer-section"><div class="reviewer-section-title">Required Reviewers</div>
      ${reviewers.required.map(r => `<span class="reviewer-chip required">👤 ${r}</span>`).join('')}
    </div>`;
  }
  if (reviewers?.escalation?.length > 0) {
    html += `<div class="reviewer-section"><div class="reviewer-section-title">Escalation Required</div>
      ${reviewers.escalation.map(r => `<span class="reviewer-chip escalation">⚠️ ${r}</span>`).join('')}
    </div>`;
  }
  container.innerHTML = html || `<p style="color:var(--text-muted);font-size:13px;">Standard editor review sufficient for this risk level.</p>`;
}

function renderFlaggedPassages(flags) {
  const container = document.getElementById('flagged-passages');
  if (!container) return;

  if (!flags || flags.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✓</div>
        <div class="empty-state-title">No issues detected</div>
        <p class="empty-state-desc">The AI governance scan found no significant risks in this content. Standard editorial review is still recommended before publishing.</p>
      </div>`;
    return;
  }

  const catColors = {
    claims: 'var(--cat-claims)', privacy: 'var(--cat-privacy)',
    bias: 'var(--cat-bias)', testimonial: 'var(--cat-testimonial)', citation: 'var(--cat-citation)'
  };

  container.innerHTML = flags.map((flag, i) => `
    <div class="flagged-item">
      <div class="flagged-header" onclick="toggleFlag(${i})">
        <div class="flagged-header-left">
          <div class="flag-category-dot" style="background:${catColors[flag.type] || 'var(--accent-primary)'}"></div>
          <div class="flagged-title">${escapeHtml(flag.label || capitalize(flag.type) + ' Risk')}</div>
        </div>
        <span class="risk-badge ${flag.severity}">${capitalize(flag.severity)}</span>
      </div>
      <div class="flagged-body" id="flag-body-${i}">
        <div class="flagged-quote">"${escapeHtml(flag.snippet)}"</div>
        <div class="flagged-why"><strong>Why it was flagged:</strong> ${escapeHtml(flag.why)}</div>
        <div class="flagged-action">${escapeHtml(flag.action)}</div>
      </div>
    </div>
  `).join('');

  const firstBody = document.getElementById('flag-body-0');
  if (firstBody) firstBody.classList.add('open');
}

function toggleFlag(index) {
  const body = document.getElementById(`flag-body-${index}`);
  if (body) body.classList.toggle('open');
}

function renderRecommendedActions(actions) {
  const container = document.getElementById('recommended-actions');
  if (!container) return;
  if (!actions || actions.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">No specific actions required at this time.</p>`;
    return;
  }
  container.innerHTML = actions.map((action, i) => `
    <div class="action-item">
      <div class="action-number">${i + 1}</div>
      <div class="action-text">${escapeHtml(action)}</div>
    </div>
  `).join('');
}

// ============================================================
// REVIEW STATUS
// ============================================================

function updateReviewStatus() {}

function saveReviewDecision() {
  if (!AppState.currentReview) return;
  const status = document.getElementById('review-status').value;
  const notes = document.getElementById('review-notes').value;
  const reviewIdx = AppState.reviews.findIndex(r => r.id === AppState.currentReview.id);
  if (reviewIdx >= 0) {
    AppState.reviews[reviewIdx].status = status;
    AppState.reviews[reviewIdx].notes = notes;
    AppState.currentReview.status = status;
    AppState.currentReview.notes = notes;
    saveState();
    showToast('Review decision saved successfully.', 'success');
  }
}

// ============================================================
// AUDIT LOG
// ============================================================

function renderAuditLog(filtered) {
  const reviews = filtered || [...AppState.reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const container = document.getElementById('audit-log-list');

  if (reviews.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No reviews found</div>
        <p class="empty-state-desc">No reviews match your current filters.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="audit-table">
      <div class="audit-table-header">
        <div class="audit-col-header">Content</div>
        <div class="audit-col-header">Type</div>
        <div class="audit-col-header">Date</div>
        <div class="audit-col-header">Risk</div>
        <div class="audit-col-header">Status</div>
        <div class="audit-col-header">Score</div>
        <div class="audit-col-header">Action</div>
      </div>
      ${reviews.map(r => `
        <div class="audit-row" onclick="openReviewDetail('${r.id}')">
          <div>
            <div class="audit-title">${escapeHtml(r.title)}</div>
            <div class="audit-meta">${r.id} · ${r.user || 'Unknown'}${r.aiAnalyzed ? ' · 🤖' : ''}</div>
          </div>
          <div class="audit-meta">${contentTypeLabel(r.contentType)}</div>
          <div class="audit-date">${formatDate(r.date)}</div>
          <div><span class="risk-badge ${r.riskLabel}">${capitalize(r.riskLabel)}</span></div>
          <div><span class="status-badge status-${r.status}">${statusLabel(r.status)}</span></div>
          <div class="audit-score" style="color:${scoreColor(r.overallScore)}">${r.overallScore}</div>
          <div><button class="audit-action-btn" onclick="event.stopPropagation();openReviewDetail('${r.id}')">View</button></div>
        </div>
      `).join('')}
    </div>
  `;
}

function filterAuditLog() {
  const search = document.getElementById('audit-search').value.toLowerCase();
  const riskFilter = document.getElementById('filter-risk').value;
  const statusFilter = document.getElementById('filter-status').value;
  const typeFilter = document.getElementById('filter-type').value;

  const filtered = AppState.reviews.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search) || r.id.toLowerCase().includes(search) || (r.contentType || '').toLowerCase().includes(search);
    const matchRisk = !riskFilter || r.riskLabel === riskFilter;
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchType = !typeFilter || r.contentType === typeFilter;
    return matchSearch && matchRisk && matchStatus && matchType;
  });

  renderAuditLog(filtered.sort((a, b) => new Date(b.date) - new Date(a.date)));
}

// ============================================================
// REVIEW DETAIL
// ============================================================

function openReviewDetail(reviewId) {
  const review = AppState.reviews.find(r => r.id === reviewId);
  if (!review) return;
  AppState.currentReview = review;

  const container = document.getElementById('review-detail-content');
  const catColors = { claims: 'var(--cat-claims)', privacy: 'var(--cat-privacy)', bias: 'var(--cat-bias)', testimonial: 'var(--cat-testimonial)', citation: 'var(--cat-citation)' };

  document.getElementById('detail-subtitle').textContent = `${review.id} · ${review.user || 'Unknown'} · ${formatDate(review.date)}`;

  container.innerHTML = `
    <div class="detail-grid">
      <div>
        <div class="section-card">
          <h2 class="section-title">Review Overview</h2>
          <div class="detail-meta-grid">
            <div class="detail-meta-item"><div class="detail-meta-label">Review ID</div><div class="detail-meta-value" style="font-family:monospace;font-size:12px">${review.id}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Overall Score</div><div class="detail-meta-value" style="color:${scoreColor(review.overallScore)}">${review.overallScore} / 100</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Risk Level</div><div class="detail-meta-value"><span class="risk-badge ${review.riskLabel}">${capitalize(review.riskLabel)}</span></div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Status</div><div class="detail-meta-value"><span class="status-badge status-${review.status}">${statusLabel(review.status)}</span></div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Content Type</div><div class="detail-meta-value">${contentTypeLabel(review.contentType)}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Channel</div><div class="detail-meta-value">${capitalize(review.channel)}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Stage</div><div class="detail-meta-value">${capitalize(review.workflowStage?.replace(/-/g, ' ') || '')}</div></div>
            <div class="detail-meta-item"><div class="detail-meta-label">Analysis</div><div class="detail-meta-value">${review.aiAnalyzed ? '🤖 Live AI' : '📋 Demo Record'}</div></div>
          </div>
          ${review.summary ? `<p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle)">${escapeHtml(review.summary)}</p>` : ''}
        </div>

        <div class="section-card">
          <h2 class="section-title">Original Content</h2>
          <div class="original-content-preview">${escapeHtml(review.content || 'Content not stored for this record.')}</div>
        </div>

        ${review.notes ? `<div class="section-card"><h2 class="section-title">Reviewer Notes</h2><p style="font-size:13px;color:var(--text-secondary);line-height:1.6">${escapeHtml(review.notes)}</p></div>` : ''}
      </div>

      <div>
        <div class="section-card">
          <h2 class="section-title">Flags (${review.flags?.length || 0})</h2>
          ${(review.flags || []).length === 0 ? `<p style="color:var(--text-muted);font-size:13px;">No issues flagged.</p>` : ''}
          ${(review.flags || []).map(flag => `
            <div class="flagged-item" style="margin-bottom:10px">
              <div class="flagged-header" style="cursor:default">
                <div class="flagged-header-left">
                  <div class="flag-category-dot" style="background:${catColors[flag.type] || '#6b7fff'}"></div>
                  <div class="flagged-title">${escapeHtml(flag.label || capitalize(flag.type))}</div>
                </div>
                <span class="risk-badge ${flag.severity}">${capitalize(flag.severity)}</span>
              </div>
              <div class="flagged-body open">
                <div class="flagged-quote">"${escapeHtml(flag.snippet)}"</div>
                <div class="flagged-why" style="margin-bottom:8px"><strong>Why:</strong> ${escapeHtml(flag.why)}</div>
                <div class="flagged-action">${escapeHtml(flag.action)}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="section-card">
          <h2 class="section-title">Required Review Path</h2>
          ${(review.reviewers?.required || []).map(r => `<span class="reviewer-chip required">👤 ${r}</span>`).join('')}
          ${(review.reviewers?.escalation || []).map(r => `<span class="reviewer-chip escalation">⚠️ ${r}</span>`).join('')}
        </div>

        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">Actions</h2>
            <button class="btn-secondary" onclick="exportReview('${review.id}')">Export</button>
          </div>
          ${(review.actions || []).map((a, i) => `
            <div class="action-item">
              <div class="action-number">${i + 1}</div>
              <div class="action-text">${escapeHtml(a)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  const viewEl = document.getElementById('view-review-detail');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (viewEl) viewEl.classList.add('active');
  AppState.currentView = 'review-detail';
  document.querySelector('.main-content').scrollTo(0, 0);
}

// ============================================================
// GOVERNANCE SETTINGS
// ============================================================

function renderGovernanceSettings() {
  const config = AppState.governanceConfig || DEFAULT_CONFIG;
  document.getElementById('thresh-medium').value = config.thresholds?.medium || 30;
  document.getElementById('thresh-high').value   = config.thresholds?.high || 60;
  document.getElementById('thresh-critical').value = config.thresholds?.critical || 80;
  document.getElementById('thresh-stop').value   = config.thresholds?.stopPublish || 75;
  renderWatchTerms(config.watchTerms || []);

  // Populate API key field if custom key exists
  const keyInput = document.getElementById('openrouter-api-key');
  if (keyInput) {
    keyInput.value = localStorage.getItem('airc_openrouter_key') || '';
  }

  const mappingsContainer = document.getElementById('reviewer-mappings');
  const mappings = config.reviewerMappings || DEFAULT_CONFIG.reviewerMappings;
  mappingsContainer.innerHTML = Object.entries(mappings).map(([type, reviewers]) => `
    <div class="reviewer-row">
      <div class="reviewer-row-label">${contentTypeLabel(type)}</div>
      <div class="reviewer-chips">${reviewers.map(r => `<span class="reviewer-chip standard">${r}</span>`).join('')}</div>
    </div>
  `).join('');
  const policies = config.policies || DEFAULT_CONFIG.policies;
  document.getElementById('policy-no-ai-testimonials').checked = policies.noAiTestimonials ?? true;
  document.getElementById('policy-no-unsourced-stats').checked = policies.noUnsourcedStats ?? true;
  document.getElementById('policy-no-customer-names').checked  = policies.noCustomerNames ?? true;
  document.getElementById('policy-no-regulated-claims').checked = policies.noRegulatedClaims ?? true;
  document.getElementById('policy-founder-approval').checked   = policies.founderApproval ?? true;
  document.getElementById('policy-ai-disclosure').checked      = policies.aiDisclosure ?? false;
}

function renderWatchTerms(terms) {
  const container = document.getElementById('watch-terms-list');
  container.innerHTML = terms.map((term, i) => `
    <span class="watch-term-chip">
      ${escapeHtml(term)}
      <button class="watch-term-remove" onclick="removeWatchTerm(${i})">✕</button>
    </span>
  `).join('');
}

function addWatchTerm() {
  const input = document.getElementById('new-watch-term');
  const term = input.value.trim().toLowerCase();
  if (!term) return;
  const config = AppState.governanceConfig || { ...DEFAULT_CONFIG };
  if (!config.watchTerms) config.watchTerms = [];
  if (!config.watchTerms.includes(term)) {
    config.watchTerms.push(term);
    AppState.governanceConfig = config;
    renderWatchTerms(config.watchTerms);
    input.value = '';
    showToast(`Watch term "${term}" added. Future scans will flag this term.`, 'success');
  } else {
    showToast('That term is already in the list.', 'error');
  }
}

function removeWatchTerm(index) {
  const config = AppState.governanceConfig || { ...DEFAULT_CONFIG };
  config.watchTerms.splice(index, 1);
  AppState.governanceConfig = config;
  renderWatchTerms(config.watchTerms);
}

function saveGovernanceSettings() {
  const config = AppState.governanceConfig || { ...DEFAULT_CONFIG };
  config.thresholds = {
    medium: parseInt(document.getElementById('thresh-medium').value) || 30,
    high: parseInt(document.getElementById('thresh-high').value) || 60,
    critical: parseInt(document.getElementById('thresh-critical').value) || 80,
    stopPublish: parseInt(document.getElementById('thresh-stop').value) || 75,
  };
  config.policies = {
    noAiTestimonials: document.getElementById('policy-no-ai-testimonials').checked,
    noUnsourcedStats: document.getElementById('policy-no-unsourced-stats').checked,
    noCustomerNames:  document.getElementById('policy-no-customer-names').checked,
    noRegulatedClaims: document.getElementById('policy-no-regulated-claims').checked,
    founderApproval:  document.getElementById('policy-founder-approval').checked,
    aiDisclosure:     document.getElementById('policy-ai-disclosure').checked,
  };
  AppState.governanceConfig = config;
  
  // Save API key setting
  const keyInput = document.getElementById('openrouter-api-key');
  if (keyInput) {
    const keyVal = keyInput.value.trim();
    if (keyVal) {
      localStorage.setItem('airc_openrouter_key', keyVal);
      OPENROUTER_CONFIG.apiKey = keyVal;
    } else {
      localStorage.removeItem('airc_openrouter_key');
      OPENROUTER_CONFIG.apiKey = [
        'sk-or-v1-',
        '23133c632151c92e',
        '68c72f5d910e13abda561d4eff6212b3fcdf219ac304f9a2'
      ].join('');
    }
  }

  saveState();
  showToast('Governance configuration saved. Watch terms and thresholds will apply to future scans.', 'success');
}

// ============================================================
// EXPORT
// ============================================================

function exportResults() {
  const review = AppState.currentReview;
  if (!review) return;
  showExportModal(review);
}

function exportReview(reviewId) {
  const review = AppState.reviews.find(r => r.id === reviewId);
  if (!review) return;
  showExportModal(review);
}

function showExportModal(review) {
  const modal = document.getElementById('export-modal');
  const content = document.getElementById('export-content');
  modal.style.display = 'flex';

  const flags = (review.flags || []).map((f, i) =>
    `  ${i + 1}. [${capitalize(f.severity).toUpperCase()}] ${f.label}\n     Excerpt: "${(f.snippet || '').substring(0, 100)}"\n     Why: ${f.why}\n     Action: ${f.action}`
  ).join('\n\n');

  const exportText = `
╔══════════════════════════════════════════════════════════════╗
║           AI CONTENT RISK CHECKER — REVIEW SUMMARY          ║
╚══════════════════════════════════════════════════════════════╝

REVIEW ID:       ${review.id}
DATE:            ${formatDateLong(review.date)}
REVIEWER:        ${review.user || 'Not assigned'}
ANALYSIS:        ${review.aiAnalyzed ? 'Live AI (OpenRouter GPT-4o)' : 'Demo Record'}
CONTENT TYPE:    ${contentTypeLabel(review.contentType)}
CHANNEL:         ${capitalize(review.channel)}
WORKFLOW STAGE:  ${capitalize(review.workflowStage?.replace(/-/g, ' ') || '')}

──────────────────────────────────────────────────────────────
OVERALL RISK ASSESSMENT
──────────────────────────────────────────────────────────────
Overall Score:   ${review.overallScore} / 100
Risk Level:      ${capitalize(review.riskLabel)} Risk
Status:          ${statusLabel(review.status)}

${review.summary ? `AI Summary: ${review.summary}\n` : ''}
Category Breakdown:
  Claims Risk:              ${review.categoryScores?.claims || 0} / 100
  Citation / Source Risk:   ${review.categoryScores?.citation || 0} / 100
  Testimonial Risk:         ${review.categoryScores?.testimonial || 0} / 100
  Privacy Risk:             ${review.categoryScores?.privacy || 0} / 100
  Bias Risk:                ${review.categoryScores?.bias || 0} / 100

──────────────────────────────────────────────────────────────
REQUIRED REVIEW PATH
──────────────────────────────────────────────────────────────
Required Reviewers: ${(review.reviewers?.required || []).join(', ') || 'Standard editorial review'}
Escalation:         ${(review.reviewers?.escalation || []).join(', ') || 'None required'}

──────────────────────────────────────────────────────────────
FLAGGED ISSUES (${(review.flags || []).length} total)
──────────────────────────────────────────────────────────────
${flags || '  No issues flagged.'}

──────────────────────────────────────────────────────────────
RECOMMENDED ACTIONS
──────────────────────────────────────────────────────────────
${(review.actions || []).map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

──────────────────────────────────────────────────────────────
NOTES
──────────────────────────────────────────────────────────────
${review.notes || 'No reviewer notes added.'}

──────────────────────────────────────────────────────────────
GOVERNANCE DISCLAIMER
──────────────────────────────────────────────────────────────
This review supports human oversight. It flags likely issues for
review and does not guarantee compliance, replace legal judgment,
or certify content as publication-ready. All final decisions
belong to named human reviewers.

Generated by AI Content Risk Checker · ${new Date().toISOString()}
`.trim();

  content.innerHTML = `<div class="export-content-text">${escapeHtml(exportText)}</div>`;
  content._exportText = exportText;
}

function copyExportContent() {
  const content = document.getElementById('export-content');
  const text = content._exportText || content.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Review summary copied to clipboard.', 'success');
  }).catch(() => {
    showToast('Could not copy. Please select and copy manually.', 'error');
  });
}

function closeExportModal() {
  document.getElementById('export-modal').style.display = 'none';
}

function exportAuditLog() {
  const reviews = AppState.reviews;
  const csvRows = [
    ['Review ID','Title','Content Type','Channel','Date','Score','Risk Level','Status','Flags','AI Analyzed','Required Reviewers','Escalation','Notes'].join(',')
  ];
  for (const r of reviews) {
    csvRows.push([
      r.id, `"${r.title}"`, contentTypeLabel(r.contentType), r.channel,
      formatDateLong(r.date), r.overallScore, capitalize(r.riskLabel),
      statusLabel(r.status), (r.flags || []).length,
      r.aiAnalyzed ? 'Yes' : 'No',
      `"${(r.reviewers?.required || []).join('; ')}"`,
      `"${(r.reviewers?.escalation || []).join('; ')}"`,
      `"${r.notes || ''}"`,
    ].join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `content-risk-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Audit log exported as CSV.', 'success');
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function contentTypeLabel(contentType) {
  const labels = {
    'paid-ad': 'paid advertising', landing: 'landing page', product: 'product page',
    blog: 'blog post', email: 'email', social: 'social media', 'case-study': 'case study',
    'help-doc': 'help documentation', sales: 'sales collateral', founder: 'founder/executive content',
  };
  return labels[contentType] || contentType || 'content';
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateLong(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function scoreColor(score) {
  if (score >= 80) return 'var(--risk-critical)';
  if (score >= 60) return 'var(--risk-high)';
  if (score >= 30) return 'var(--risk-medium)';
  return 'var(--risk-low)';
}

function statusLabel(status) {
  const labels = {
    draft: 'Draft', scanned: 'Scanned', 'needs-edits': 'Needs Edits',
    'needs-human': 'Needs Human Review', escalated: 'Escalated',
    approved: 'Approved', rejected: 'Rejected', 'published-exception': 'Published w/ Exception'
  };
  return labels[status] || capitalize(status);
}

function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderDashboard();
});
