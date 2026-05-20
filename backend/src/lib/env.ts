// This file MUST be the very first import in server.ts
// It ensures environment variables are loaded before any other modules initialize.
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
