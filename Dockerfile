# Multi-Runtime Container: Node.js 20 + Python 3.12 (Algorand PyTeal & AlgoKit)
FROM node:20-bookworm-slim

# Install system utilities, Python 3, pip, and venv
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install smart contract runtime dependencies
RUN pip install --no-cache-dir \
    "pyteal>=0.27.0" \
    "py-algorand-sdk>=2.11.0" \
    "algokit-utils>=4.0.0" \
    "python-dotenv>=1.0.0"

# Set application working directory
WORKDIR /app

# Copy root workspace package manifests
COPY package*.json ./

# Install Node dependencies (including tsx for running ESM TypeScript server)
RUN npm install

# Copy application source code
COPY . .

# Set default production environment variables
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# Expose default Render port
EXPOSE 10000

# Start Hono API gateway and WebSocket event bus
CMD ["npm", "start"]
