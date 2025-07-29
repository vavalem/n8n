import { Logger } from '@n8n/backend-common';
import { RoleRepository, Scope, ScopeRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ALL_SCOPES, ALL_ROLES, scopeInformation } from '@n8n/permissions';

@Service()
export class AuthRolesService {
	constructor(
		private readonly logger: Logger,
		private readonly scopeRepository: ScopeRepository,
		private readonly roleRepository: RoleRepository,
	) {}

	private async syncScopes() {
		const availableScopes = await this.scopeRepository.find({
			select: {
				slug: true,
				displayName: true,
				description: true,
			},
		});

		const scopesToUpdate = ALL_SCOPES.map((slug) => {
			const info = scopeInformation[slug] ?? {
				displayName: slug,
				description: null,
			};
			return [slug, info.displayName, info.description ?? null] as const;
		})
			.filter(([slug, displayName, description]) => {
				const existingScope = availableScopes.find((scope) => scope.slug === slug);
				if (existingScope) {
					// Check if the existing scope needs to be updated
					return (
						existingScope.displayName !== displayName || existingScope.description !== description
					);
				}
				// If the scope does not exist, it needs to be created, so we return true
				return true;
			})
			.map(([slug, displayName, sourceDescription]) => {
				const existingScope = availableScopes.find((scope) => scope.slug === slug);
				if (existingScope) {
					existingScope.displayName = displayName;
					existingScope.description = sourceDescription ?? null;
					return existingScope;
				}
				// If the scope does not exist, return a new object
				const newScope = new Scope();
				newScope.slug = slug;
				newScope.displayName = displayName;
				newScope.description = sourceDescription ?? null;
				return newScope;
			});

		if (scopesToUpdate.length > 0) {
			this.logger.info(`Updating ${scopesToUpdate.length} scopes...`);
			await this.scopeRepository.save(scopesToUpdate);
			this.logger.info('Scopes updated successfully.');
		} else {
			this.logger.info('No scopes to update.');
		}
	}

	private async syncRoles() {
		const existingRoles = await this.roleRepository.find({
			select: {
				slug: true,
				displayName: true,
				description: true,
				systemRole: true,
				roleType: true,
			},
			where: {
				systemRole: true,
			},
		});

		const allScopes = await this.scopeRepository.find({
			select: {
				slug: true,
			},
		});

		for (const roleNamespace of Object.keys(ALL_ROLES) as Array<keyof typeof ALL_ROLES>) {
			const rolesToUpdate = ALL_ROLES[roleNamespace]
				.map((role) => {
					const existingRole = existingRoles.find((r) => r.slug === role.role);
					return [role, existingRole] as const;
				})
				.filter(([role, existingRole]) => {
					// If the role exists, check if it needs to be updated
					if (existingRole) {
						return (
							existingRole.displayName !== role.name ||
							existingRole.description !== role.description ||
							existingRole.roleType !== roleNamespace ||
							existingRole.scopes.some((scope) => !role.scopes.includes(scope.slug)) || // DB roles has scope that it should not have
							role.scopes.some((scope) => !existingRole.scopes.some((s) => s.slug === scope)) // A role has scope that is not in DB
						);
					}
					// If the role does not exist, it needs to be created
					return true;
				})
				.map(([role, existingRole]) => {
					if (existingRole) {
						existingRole.displayName = role.name;
						existingRole.description = role.description;
						existingRole.roleType = roleNamespace;
						existingRole.scopes = allScopes.filter((scope) => role.scopes.includes(scope.slug));
						return existingRole;
					}

					// If the role does not exist, create a new one
					const newRole = this.roleRepository.create({
						slug: role.role,
						displayName: role.name,
						description: role.description,
						roleType: roleNamespace,
						systemRole: true,
						scopes: allScopes.filter((scope) => role.scopes.includes(scope.slug)),
					});
					return newRole;
				});
			if (rolesToUpdate.length > 0) {
				this.logger.info(`Updating ${rolesToUpdate.length} ${roleNamespace} roles...`);
				await this.roleRepository.save(rolesToUpdate);
				this.logger.info(`${roleNamespace} roles updated successfully.`);
			} else {
				this.logger.info(`No ${roleNamespace} roles to update.`);
			}
		}
	}

	async init() {
		this.logger.info('Initializing AuthRolesService...');
		await this.syncScopes();
		await this.syncRoles();
		this.logger.info('AuthRolesService initialized successfully.');
	}
}
