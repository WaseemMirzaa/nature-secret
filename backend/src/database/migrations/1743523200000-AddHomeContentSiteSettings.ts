import { MigrationInterface, QueryRunner } from 'typeorm';

/** Default home page content keys (same defaults as SettingsService). INSERT IGNORE — does not overwrite existing rows. */
const HOME_SETTINGS: [string, string][] = [
  [
    'home_hero_intro',
    'Premium botanical skincare and body oils for a calm routine. Nature Secret PX Oil is a relaxing massage oil—comforting neck, muscles, and joints when they feel tired or tight after long days.',
  ],
  ['home_story_label', 'Our story'],
  ['home_story_heading', 'Our journey began at home.'],
  [
    'home_story_html',
    `<p>Like many families in Pakistan, we wanted simple, honest care at home. Our father crafted a botanical body oil from traditional plant knowledge and ingredients we already trusted—first for family, then for friends.</p><p>At first, it was only for our own family. Over time, we shared the oil with friends and relatives who wanted a soothing massage ritual. The feedback was overwhelmingly positive—many loved the feel on skin and the quiet evening routine.</p><p>Encouraged by their experiences, we realized this simple formula could support more people in their daily self-care routines. That is how <strong>Nature Secret PX Oil</strong> was born—a relaxing massage oil many use to comfort neck, muscles, and joints as part of their unwind ritual.</p><p>Today, we are proud to share the same heritage-inspired oil with people across Pakistan. Inspired by our belief in natural care, we are now developing a collection of skincare serums and body care for your modern routine.</p><p><strong>From our home to yours: Natural care you can trust.</strong></p>`,
  ],
];

export class AddHomeContentSiteSettings1743523200000 implements MigrationInterface {
  name = 'AddHomeContentSiteSettings1743523200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`site_settings\` (
        \`key\` varchar(64) NOT NULL,
        \`value\` text NULL,
        PRIMARY KEY (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    for (const [key, value] of HOME_SETTINGS) {
      await queryRunner.query(
        'INSERT IGNORE INTO `site_settings` (`key`, `value`) VALUES (?, ?)',
        [key, value],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keys = HOME_SETTINGS.map(([k]) => k);
    await queryRunner.query(
      `DELETE FROM \`site_settings\` WHERE \`key\` IN (${keys.map(() => '?').join(', ')})`,
      keys,
    );
  }
}
