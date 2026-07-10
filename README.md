Reserc

From scattered data to structured argument.
Reserc is a research platform for student economists studying social and environmental questions in low- and middle-income countries (LMICs).

Live app: reserc.vercel.app

Features
  - Live World Bank data — access to 130+ countries and 40+ indicators
  - AI research briefs — AI-generated interpretations and summaries of raw data, powered by the Anthropic API
  - Authentication — sign in with Google, GitHub, or email/password
  - Interactive exploration — stat cards, charts, and structured summaries to help turn raw data into research arguments


Tech Stack
  - Runtime: Node.js (custom server via server.js, no framework)
  - Database: Neon (serverless Postgres), accessed via pg
  - Auth: bcrypt for password hashing, plus Google OAuth 2.0 and GitHub OAuth for social login
  - AI: Anthropic API (Claude) for research summaries and chat
  - Hosting: Vercel

Getting Started
  Prerequisites
    - Node.js
    - A Neon Postgres database
    - An Anthropic API key
    - OAuth credentials for Google (Google Cloud Console) and GitHub (GitHub Developer Settings)

  Local Setup 
  1. Clone the repository:
     git clone https://github.com/yutoy123/Reserc.git
     cd Reserc
     
  2. Install dependencies:
     npm install
     
  3. Copy the example environment file and fill in your own values:
     cp .env.example .env
  
      Required environment variables
       ANTHROPIC_API_KEY=
       NEON_DATABASE_URL=
       GOOGLE_CLIENT_ID=
       GOOGLE_CLIENT_SECRET=
       GITHUB_CLIENT_ID=
       GITHUB_CLIENT_SECRET=
       PORT=3000

   4. Run the server locally:
      npm start


Deployment

This project is deployed on Vercel. Pushes to main automatically trigger a production deployment.
Important: OAuth redirect URIs (Google and GitHub) are whitelisted only for the stable production domain (https://reserc.vercel.app), not Vercel's per-deployment preview URLs. Always test sign-in from the production domain.
Make sure all environment variables above are also set in your Vercel project under Settings → Environment Variables, matching the exact names your code expects.

Project Structure

Reserc/
├── lib/
│   ├── auth.js               # Auth logic, session handling
│   ├── db.js                 # Neon/Postgres connection
│   ├── chatAgent.js           # AI chat agent
│   ├── researchReport.js      # AI-generated research report/brief logic
│   ├── exploreFetch.js        # World Bank data fetching
│   ├── exploreIndicators.js   # Indicator handling
│   ├── exploreSummary.js      # AI summary generation for explored data
│   ├── frameworks.js          # Research frameworks / hypothesis templates
│   ├── library.js             # Saved research library
│   ├── prompts.js             # Claude prompt templates
│   └── worldBank.js           # World Bank API integration
├── public/            # Static frontend assets (HTML, CSS, client JS)
├── attached_assets/    # Additional assets
├── server.js           # Main server entry point (routing, OAuth, static serving)
├── package.json
└── .env.example

  Internally, this project is named research-aggregator in package.json — described as "Layer 1 — Development economics research aggregator for LMICs."

Contributing
  This is currently a solo project in active development. Issues and suggestions are welcome.

License
  No license specified yet.
