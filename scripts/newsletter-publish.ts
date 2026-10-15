import 'dotenv/config';
import { brand } from '../src/config/brand';

/**
 * @deprecated The digest is published on Substack.
 * This command does not publish a row or send mail.
 */
console.log(`${brand.newsletterName} is published twice a week on Substack: ${brand.substackUrl}`);
