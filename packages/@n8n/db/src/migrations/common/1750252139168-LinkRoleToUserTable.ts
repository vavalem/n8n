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
		const slugColumn = escape.columnName('slug');
		const roleSlugColumn = escape.columnName('roleSlug');
		const roleTypeColumn = escape.columnName('roleType');
		const systemRoleColumn = escape.columnName('systemRole');

		// Make sure that the global roles that we need exist
		try {
			await runQuery(
				`INSERT INTO ${tableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole)`,
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
				`INSERT INTO ${tableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole)`,
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
				`INSERT INTO ${tableName} (${slugColumn}, ${roleTypeColumn}, ${systemRoleColumn}) VALUES (:slug, :roleType, :systemRole)`,
				{
					slug: 'global:member',
					roleType: 'global',
					systemRole: true,
				},
			);
		} catch (error) {
			// Ignore if the role already exists
		}

		await addColumns('user', [column('roleSlug').varchar(128).default("'global:member'").notNull]);

		await runQuery(
			`UPDATE ${userTableName} SET ${roleSlugColumn} = role WHERE role != ${roleSlugColumn}`,
		);

		// Fallback to 'global:member' for users that do not have a correct role set
		// This should not happen in a correctly set up system, but we want to ensure
		// that all users have a role set, before we add the foreign key constraint
		await runQuery(
			`UPDATE ${userTableName} SET ${roleSlugColumn} = 'global:member' WHERE NOT EXISTS (SELECT 1 FROM ${tableName} WHERE slug = ${roleSlugColumn})`,
		);

		await addForeignKey('user', 'roleSlug', ['role', 'slug']);
	}

	async down({ schemaBuilder: { dropForeignKey, dropColumns } }: MigrationContext) {
		await dropForeignKey('user', 'roleSlug', ['role', 'slug']);
		await dropColumns('user', ['roleSlug']);
	}
}
