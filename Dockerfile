# ---- Stage 1: Build the React Frontend ----
# Use a Node.js image to create the 'dist' folder
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app/client

# Copy package files and install ALL dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

#EXPOSE 3000
#CMD ["npm", "start"]

# Run the build script to create the 'dist' folder
RUN npm run build

# ---- Stage 2: Setup the Production Server ----
# Use a fresh, lightweight Node.js image for the final product
FROM node:18-alpine

WORKDIR /app

# Copy package files again
COPY package*.json ./

# Install ONLY production dependencies to keep the image small
RUN npm install --production

# Copy your server file
COPY server.js ./

# **THE MAGIC STEP**: Copy the 'dist' folder from the 'builder' stage
COPY --from=builder /app/client/dist ./dist

# Tell Docker that your app will run on port 3000
EXPOSE 3001

# The command to run your server when the container starts
CMD ["node", "server.js"]



