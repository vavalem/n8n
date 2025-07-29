import { Column, Entity, JoinTable, ManyToMany, PrimaryColumn } from '@n8n/typeorm';

import { Scope } from './scope';

@Entity({
	name: 'role',
})
export class Role {
	@PrimaryColumn({
		type: String,
		name: 'slug',
	})
	slug: string;

	@Column({
		type: String,
		nullable: false,
		name: 'displayName',
	})
	displayName: string | null;

	@Column({
		type: String,
		nullable: true,
		name: 'description',
	})
	description: string | null;

	@Column({
		type: Boolean,
		default: false,
		name: 'systemRole',
	})
	systemRole: boolean; // Indicates if the role is managed by the system and cannot be edited

	@Column({
		type: String,
		name: 'roleType',
	})
	roleType: 'global' | 'project' | 'workflow' | 'credential'; // Type of the role, e.g., global, project, or workflow

	@ManyToMany(() => Scope, {
		eager: true,
	})
	@JoinTable({
		name: 'role_scope',
		joinColumn: { name: 'role_slug', referencedColumnName: 'slug' },
		inverseJoinColumn: { name: 'scope_slug', referencedColumnName: 'slug' },
	})
	scopes: Scope[];
}
