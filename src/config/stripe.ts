import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'dummy_key', {
  apiVersion: '2026-08-26.dahlia', // using latest or recent version
  typescript: true,
});

export default stripe;
