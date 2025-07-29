import type { MigrationContext, ReversibleMigration } from '../migration-types';

/*
 * This migration
 */

export class LinkRoleToUserTable1750252139168 implements ReversibleMigration {
	async up({
		schemaBuilder: { addForeignKey, addColumns, column },
		escape,
		runQuery,
	}: MigrationContext) {
		const tableName = escape.tableName('role');
		const userTableName = escape.tableName('user');

		// Make sure that the global roles that we need exist
		try {
			await runQuery(
				`INSERT INTO ${tableName} (slug, roleType, systemRole) VALUES (:slug, :roleType, :systemRole)`,
				{
					slug: 'global:owner',
					roleType: 'global',
					systemRole: true,
				},
			);
		} catch (error) {
			// Ignore if the role already exists
		}
		try {
			await runQuery(
				`INSERT INTO ${tableName} (slug, roleType, systemRole) VALUES (:slug, :roleType, :systemRole)`,
				{
					slug: 'global:admin',
					roleType: 'global',
					systemRole: true,
				},
			);
		} catch (error) {
			// Ignore if the role already exists
		}
		try {
			await runQuery(
				`INSERT INTO ${tableName} (slug, roleType, systemRole) VALUES (:slug, :roleType, :systemRole)`,
				{
					slug: 'global:member',
					roleType: 'global',
					systemRole: true,
				},
			);
		} catch (error) {
			// Ignore if the role already exists
		}

		await addColumns('user', [column('role_slug').varchar(128).default("'global:member'").notNull]);

		await runQuery(`UPDATE ${userTableName} SET role_slug = role WHERE role != role_slug`);

		// Fallback to 'global:member' for users that do not have a correct role set
		// This should not happen in a correctly set up system, but we want to ensure
		// that all users have a role set, before we add the foreign key constraint
		await runQuery(
			`UPDATE ${userTableName} SET role_slug = 'global:member' WHERE NOT EXISTS (SELECT 1 FROM ${tableName} WHERE slug = role_slug)`,
		);

		await addForeignKey('user', 'role_slug', ['role', 'slug']);
	}

	async down({ schemaBuilder: { dropForeignKey, dropColumns } }: MigrationContext) {
		await dropForeignKey('user', 'role_slug', ['role', 'slug']);
		await dropColumns('user', ['role_slug']);
	}
}
