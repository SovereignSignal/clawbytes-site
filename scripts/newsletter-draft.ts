import 'dotenv/config';
import { brand } from '../src/config/brand';

/**
 * @deprecated The digest is published on Substack.
 * This command does not draft, write exports, or touch the database.
 */
console.log(`${brand.newsletterName} is published twice a week on Substack: ${brand.substackUrl}`);
