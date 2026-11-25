# ==============================================================================
# 1. BASE IMAGE (Node.js 22 LTS Alpine)
# 2026 Standards: Node 18 End-of-Life (EOL) ho chuka hai (April 2025).
# Node 22 (LTS) Alpine Linux ultra-lightweight (~50MB) aur secure base image hai.
# ==============================================================================
FROM node:22-alpine
# FROM node:22-alpine ka matlab hai:
# "Docker bhai, mere container ke liye ek ultra-lightweight Alpine Linux OS taiyaar karo jisme Node.js v22 pehle se install ho, taaki main apna backend code isme chala sakun."

# ==============================================================================
# 2. WORKING DIRECTORY
# Container ke andar ek folder set karta hai jahan hamara app rahega.
# Ab aage ke saare commands (COPY, RUN, CMD) isi /app folder ke andar chalenge.
# ==============================================================================
WORKDIR /app

# ==============================================================================
# 3. ENVIRONMENT VARIABLES
# Production mode set kar rahe hain taaki Express aur baaki packages optimized chalein.
# ==============================================================================
ENV NODE_ENV=production

# ==============================================================================
# 4. DEPENDENCY FILES COPY KARNA (Docker Layer Caching)
# Pehle sirf package.json aur package-lock.json copy karte hain, pura code nahi.
# Fayda (Cache): Agar aap code change karoge lekin dependencies nahi badloge,
# toh Docker dubara install nahi karega aur build instant 1-2 second me ho jayega.
# ==============================================================================
COPY package*.json ./

# ==============================================================================
# 5. DEPENDENCIES INSTALL KARNA
# - npm ci: Clean install karta hai (package-lock.json ke exact versions install karta hai).
# - --omit=dev: Sirf production dependencies install hongi (nodemon, tsx, typescript skip honge).
# - npm cache clean --force: Temporary cache delete karke image size bohot chhota rakhta hai.
# ==============================================================================
RUN npm ci --omit=dev && npm cache clean --force

# ==============================================================================
# 6. SOURCE CODE COPY KARNA
# Baaki saara project code (jaise src/ folder) container ke andar copy kar rahe hain.
# Note: Humne .dockerignore banaya hai, jisse local Windows ke node_modules aur .env
# container me copy NAHI honge (jo production aur cross-platform ke liye zaroori hai).
# ==============================================================================
COPY . .

# ==============================================================================
# 7. SECURITY (Non-Root User)
# By default Docker container 'root' user se chalta hai jo security risk hota hai.
# Node official image me pehle se 'node' naam ka secure unprivileged user hota hai.
# Hum usi user me switch kar dete hain taaki app safely run ho sake.
# ==============================================================================
USER node

# ==============================================================================
# 8. PORT EXPOSE KARNA
# Ye Docker aur developers ko batata hai ki container ke andar app port 3000 pe chalega.
# ==============================================================================
EXPOSE 3000

# ==============================================================================
# 9. RUNTIME COMMAND (App Start)
# Jab container run hoga, tab ye command execute hogi.
# FIX 1: Entry file root me nahi, 'src/app.js' me hai.
# FIX 2: Project me kuch files TypeScript (.ts) me hain (jaise rateLimitMiddleware.ts),
# isliye hum 'npx tsx' use kar rahe hain taaki bina compilation ke TS + JS smoothly chale.
# ==============================================================================
CMD ["npx", "tsx", "src/app.js"]
