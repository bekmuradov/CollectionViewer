#!/usr/bin/env python3
"""
CollectionViewer Plugin Lifecycle Manager

This script handles install/update/delete operations for the CollectionViewer plugin.
"""

import json
import logging
import datetime
import os
import shutil
from pathlib import Path
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import structlog

logger = structlog.get_logger()

# Import the base lifecycle manager
try:
    from app.plugins.base_lifecycle_manager import BaseLifecycleManager
    logger.info("Using BaseLifecycleManager from app.plugins")
except ImportError:
    try:
        import sys
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_path = os.path.join(current_dir, "..", "..", "..", "..", "app", "plugins")
        backend_path = os.path.abspath(backend_path)

        if os.path.exists(backend_path):
            if backend_path not in sys.path:
                sys.path.insert(0, backend_path)
            from base_lifecycle_manager import BaseLifecycleManager
            logger.info(f"Using BaseLifecycleManager from local backend: {backend_path}")
        else:
            logger.warning(f"BaseLifecycleManager not found at {backend_path}, using minimal implementation")
            from abc import ABC, abstractmethod
            from datetime import datetime
            from pathlib import Path
            from typing import Set

            class BaseLifecycleManager(ABC):
                """Minimal base class for remote installations"""
                def __init__(self, plugin_slug: str, version: str, shared_storage_path: Path):
                    self.plugin_slug = plugin_slug
                    self.version = version
                    self.shared_path = shared_storage_path
                    self.active_users: Set[str] = set()
                    self.instance_id = f"{plugin_slug}_{version}"
                    self.created_at = datetime.now()
                    self.last_used = datetime.now()

                async def install_for_user(self, user_id: str, db, shared_plugin_path: Path):
                    if user_id in self.active_users:
                        return {'success': False, 'error': 'Plugin already installed for user'}
                    result = await self._perform_user_installation(user_id, db, shared_plugin_path)
                    if result['success']:
                        self.active_users.add(user_id)
                        self.last_used = datetime.now()
                    return result

                async def uninstall_for_user(self, user_id: str, db):
                    if user_id not in self.active_users:
                        return {'success': False, 'error': 'Plugin not installed for user'}
                    result = await self._perform_user_uninstallation(user_id, db)
                    if result['success']:
                        self.active_users.discard(user_id)
                        self.last_used = datetime.now()
                    return result

                @abstractmethod
                async def get_plugin_metadata(self): pass
                @abstractmethod
                async def get_module_metadata(self): pass
                @abstractmethod
                async def _perform_user_installation(self, user_id, db, shared_plugin_path): pass
                @abstractmethod
                async def _perform_user_uninstallation(self, user_id, db): pass

            logger.info("Using minimal BaseLifecycleManager implementation")

    except ImportError as e:
        logger.error(f"Failed to import BaseLifecycleManager: {e}")
        raise ImportError("CollectionViewer plugin requires BaseLifecycleManager")


class CollectionViewerLifecycleManager(BaseLifecycleManager):
    """Lifecycle manager for CollectionViewer plugin"""

    def __init__(self, plugins_base_dir: str = None):
        """Initialize the lifecycle manager"""
        self.plugin_data = {
            "name": "CollectionViewer",
            "description": "View and browse your document collections",
            "version": "1.0.0",
            "type": "frontend",
            "icon": "folder_open",
            "category": "Data Management",
            "official": False,
            "author": "BrainDrive Team",
            "compatibility": "1.0.0",
            "scope": "CollectionViewer",
            "bundle_method": "webpack",
            "bundle_location": "dist/remoteEntry.js",
            "is_local": False,
            "long_description": "A simple, functional React component plugin that fetches and displays collections from your BrainDrive instance. Built with modern React hooks and TypeScript.",
            "plugin_slug": "CollectionViewer",
            "source_type": "local",
            "source_url": "",
            "update_check_url": "",
            "last_update_check": None,
            "update_available": False,
            "latest_version": None,
            "installation_type": "remote",
            "permissions": ["api.access"]
        }

        self.module_data = [
            {
                "name": "CollectionViewer",
                "display_name": "Collection Viewer",
                "description": "View all your document collections with details",
                "icon": "folder_open",
                "category": "Data Management",
                "priority": 1,
                "props": {},
                "config_fields": {},
                "messages": {},
                "required_services": {},
                "dependencies": [],
                "layout": {
                    "minWidth": 4,
                    "minHeight": 4,
                    "defaultWidth": 8,
                    "defaultHeight": 6
                },
                "tags": ["collections", "viewer", "documents", "data"]
            }
        ]

        # Initialize base class
        logger.info(f"CollectionViewer: plugins_base_dir - {plugins_base_dir}")
        if plugins_base_dir:
            shared_path = Path(plugins_base_dir) / "shared" / self.plugin_data['plugin_slug'] / f"v{self.plugin_data['version']}"
        else:
            shared_path = Path(__file__).parent
        logger.info(f"CollectionViewer: shared_path - {shared_path}")

        super().__init__(
            plugin_slug=self.plugin_data['plugin_slug'],
            version=self.plugin_data['version'],
            shared_storage_path=shared_path
        )

    @property
    def PLUGIN_DATA(self):
        """Compatibility property for remote installer validation"""
        return self.plugin_data

    async def get_plugin_metadata(self) -> Dict[str, Any]:
        """Return plugin metadata"""
        return self.plugin_data

    async def get_module_metadata(self) -> list:
        """Return module definitions"""
        return self.module_data

    async def _perform_user_installation(self, user_id: str, db: AsyncSession, shared_plugin_path: Path) -> Dict[str, Any]:
        """Perform user-specific installation"""
        try:
            db_result = await self._create_database_records(user_id, db)
            if not db_result['success']:
                return db_result

            logger.info(f"CollectionViewer: User installation completed for {user_id}")
            return {
                'success': True,
                'plugin_id': db_result['plugin_id'],
                'plugin_slug': self.plugin_data['plugin_slug'],
                'plugin_name': self.plugin_data['name'],
                'modules_created': db_result['modules_created']
            }

        except Exception as e:
            logger.error(f"CollectionViewer: User installation failed for {user_id}: {e}")
            return {'success': False, 'error': str(e)}

    async def _perform_user_uninstallation(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Perform user-specific uninstallation"""
        try:
            existing_check = await self._check_existing_plugin(user_id, db)
            if not existing_check['exists']:
                return {'success': False, 'error': 'Plugin not found for user'}

            plugin_id = existing_check['plugin_id']
            delete_result = await self._delete_database_records(user_id, plugin_id, db)
            if not delete_result['success']:
                return delete_result

            logger.info(f"CollectionViewer: User uninstallation completed for {user_id}")
            return {
                'success': True,
                'plugin_id': plugin_id,
                'deleted_modules': delete_result['deleted_modules']
            }

        except Exception as e:
            logger.error(f"CollectionViewer: User uninstallation failed for {user_id}: {e}")
            return {'success': False, 'error': str(e)}

    async def _copy_plugin_files_impl(self, user_id: str, target_dir: Path, update: bool = False) -> Dict[str, Any]:
        """Copy plugin files to target directory"""
        try:
            source_dir = Path(__file__).parent
            copied_files = []

            exclude_patterns = {
                'node_modules',
                'package-lock.json',
                '.git',
                '.gitignore',
                '__pycache__',
                '*.pyc',
                '.DS_Store'
            }

            def should_copy(path: Path) -> bool:
                for part in path.parts:
                    if part in exclude_patterns:
                        return False
                for pattern in exclude_patterns:
                    if '*' in pattern and path.name.endswith(pattern.replace('*', '')):
                        return False
                return True

            for item in source_dir.rglob('*'):
                if item.name == 'lifecycle_manager.py' and item == Path(__file__):
                    continue

                relative_path = item.relative_to(source_dir)

                if not should_copy(relative_path):
                    continue

                target_path = target_dir / relative_path

                try:
                    if item.is_file():
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        if update and target_path.exists():
                            target_path.unlink()
                        shutil.copy2(item, target_path)
                        copied_files.append(str(relative_path))
                    elif item.is_dir():
                        target_path.mkdir(parents=True, exist_ok=True)
                except Exception as e:
                    logger.warning(f"Failed to copy {relative_path}: {e}")
                    continue

            lifecycle_manager_source = source_dir / 'lifecycle_manager.py'
            lifecycle_manager_target = target_dir / 'lifecycle_manager.py'
            if lifecycle_manager_source.exists():
                lifecycle_manager_target.parent.mkdir(parents=True, exist_ok=True)
                if update and lifecycle_manager_target.exists():
                    lifecycle_manager_target.unlink()
                shutil.copy2(lifecycle_manager_source, lifecycle_manager_target)
                copied_files.append('lifecycle_manager.py')

            logger.info(f"CollectionViewer: Copied {len(copied_files)} files to {target_dir}")
            return {'success': True, 'copied_files': copied_files}

        except Exception as e:
            logger.error(f"CollectionViewer: Error copying files: {e}")
            return {'success': False, 'error': str(e)}

    async def _validate_installation_impl(self, user_id: str, plugin_dir: Path) -> Dict[str, Any]:
        """Validate installation"""
        try:
            required_files = ["package.json", "dist/remoteEntry.js"]
            missing_files = []

            for file_path in required_files:
                if not (plugin_dir / file_path).exists():
                    missing_files.append(file_path)

            if missing_files:
                return {
                    'valid': False,
                    'error': f"Missing required files: {', '.join(missing_files)}"
                }

            package_json_path = plugin_dir / "package.json"
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)

                required_fields = ["name", "version"]
                for field in required_fields:
                    if field not in package_data:
                        return {
                            'valid': False,
                            'error': f'package.json missing required field: {field}'
                        }
            except (json.JSONDecodeError, FileNotFoundError) as e:
                return {'valid': False, 'error': f'Invalid package.json: {e}'}

            bundle_path = plugin_dir / "dist" / "remoteEntry.js"
            if bundle_path.stat().st_size == 0:
                return {'valid': False, 'error': 'Bundle file is empty'}

            logger.info(f"CollectionViewer: Installation validation passed for {user_id}")
            return {'valid': True}

        except Exception as e:
            logger.error(f"CollectionViewer: Validation error: {e}")
            return {'valid': False, 'error': str(e)}

    async def _get_plugin_health_impl(self, user_id: str, plugin_dir: Path) -> Dict[str, Any]:
        """Check plugin health"""
        try:
            health_info = {
                'bundle_exists': False,
                'bundle_size': 0,
                'package_json_valid': False
            }

            bundle_path = plugin_dir / "dist" / "remoteEntry.js"
            if bundle_path.exists():
                health_info['bundle_exists'] = True
                health_info['bundle_size'] = bundle_path.stat().st_size

            package_json_path = plugin_dir / "package.json"
            if package_json_path.exists():
                try:
                    with open(package_json_path, 'r') as f:
                        json.load(f)
                    health_info['package_json_valid'] = True
                except json.JSONDecodeError:
                    pass

            is_healthy = (
                health_info['bundle_exists'] and
                health_info['bundle_size'] > 0 and
                health_info['package_json_valid']
            )

            return {'healthy': is_healthy, 'details': health_info}

        except Exception as e:
            logger.error(f"CollectionViewer: Health check error: {e}")
            return {'healthy': False, 'details': {'error': str(e)}}

    async def _check_existing_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Check if plugin exists for user"""
        try:
            plugin_query = text("""
                SELECT id, name, version, enabled
                FROM plugin
                WHERE user_id = :user_id AND plugin_slug = :plugin_slug
            """)

            result = await db.execute(plugin_query, {
                'user_id': user_id,
                'plugin_slug': self.plugin_data['plugin_slug']
            })

            plugin_row = result.fetchone()
            if plugin_row:
                return {
                    'exists': True,
                    'plugin_id': plugin_row.id,
                    'plugin_info': {
                        'id': plugin_row.id,
                        'name': plugin_row.name,
                        'version': plugin_row.version,
                        'enabled': plugin_row.enabled
                    }
                }

            return {'exists': False}

        except Exception as e:
            logger.error(f"CollectionViewer: Error checking plugin: {e}")
            return {'exists': False, 'error': str(e)}

    async def _create_database_records(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Create database records"""
        try:
            current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            plugin_slug = self.plugin_data['plugin_slug']
            plugin_id = f"{user_id}_{plugin_slug}"

            plugin_stmt = text("""
                INSERT INTO plugin
                (id, name, description, version, type, enabled, icon, category, status,
                official, author, last_updated, compatibility, downloads, scope,
                bundle_method, bundle_location, is_local, long_description,
                config_fields, messages, dependencies, created_at, updated_at, user_id,
                plugin_slug, source_type, source_url, update_check_url, last_update_check,
                update_available, latest_version, installation_type, permissions)
                VALUES
                (:id, :name, :description, :version, :type, :enabled, :icon, :category,
                :status, :official, :author, :last_updated, :compatibility, :downloads,
                :scope, :bundle_method, :bundle_location, :is_local, :long_description,
                :config_fields, :messages, :dependencies, :created_at, :updated_at, :user_id,
                :plugin_slug, :source_type, :source_url, :update_check_url, :last_update_check,
                :update_available, :latest_version, :installation_type, :permissions)
            """)

            await db.execute(plugin_stmt, {
                'id': plugin_id,
                'name': self.plugin_data['name'],
                'description': self.plugin_data['description'],
                'version': self.plugin_data['version'],
                'type': self.plugin_data['type'],
                'enabled': True,
                'icon': self.plugin_data['icon'],
                'category': self.plugin_data['category'],
                'status': 'activated',
                'official': self.plugin_data['official'],
                'author': self.plugin_data['author'],
                'last_updated': current_time,
                'compatibility': self.plugin_data['compatibility'],
                'downloads': 0,
                'scope': self.plugin_data['scope'],
                'bundle_method': self.plugin_data['bundle_method'],
                'bundle_location': self.plugin_data['bundle_location'],
                'is_local': self.plugin_data['is_local'],
                'long_description': self.plugin_data['long_description'],
                'config_fields': json.dumps({}),
                'messages': None,
                'dependencies': None,
                'created_at': current_time,
                'updated_at': current_time,
                'user_id': user_id,
                'plugin_slug': plugin_slug,
                'source_type': self.plugin_data['source_type'],
                'source_url': self.plugin_data['source_url'],
                'update_check_url': self.plugin_data['update_check_url'],
                'last_update_check': self.plugin_data['last_update_check'],
                'update_available': self.plugin_data['update_available'],
                'latest_version': self.plugin_data['latest_version'],
                'installation_type': self.plugin_data['installation_type'],
                'permissions': json.dumps(self.plugin_data['permissions'])
            })

            modules_created = []
            for module_data in self.module_data:
                module_id = f"{user_id}_{plugin_slug}_{module_data['name']}"

                module_stmt = text("""
                    INSERT INTO module
                    (id, plugin_id, name, display_name, description, icon, category,
                    enabled, priority, props, config_fields, messages, required_services,
                    dependencies, layout, tags, created_at, updated_at, user_id)
                    VALUES
                    (:id, :plugin_id, :name, :display_name, :description, :icon, :category,
                    :enabled, :priority, :props, :config_fields, :messages, :required_services,
                    :dependencies, :layout, :tags, :created_at, :updated_at, :user_id)
                """)

                await db.execute(module_stmt, {
                    'id': module_id,
                    'plugin_id': plugin_id,
                    'name': module_data['name'],
                    'display_name': module_data['display_name'],
                    'description': module_data['description'],
                    'icon': module_data['icon'],
                    'category': module_data['category'],
                    'enabled': True,
                    'priority': module_data['priority'],
                    'props': json.dumps(module_data['props']),
                    'config_fields': json.dumps(module_data['config_fields']),
                    'messages': json.dumps(module_data['messages']),
                    'required_services': json.dumps(module_data['required_services']),
                    'dependencies': json.dumps(module_data['dependencies']),
                    'layout': json.dumps(module_data['layout']),
                    'tags': json.dumps(module_data['tags']),
                    'created_at': current_time,
                    'updated_at': current_time,
                    'user_id': user_id
                })

                modules_created.append(module_id)

            await db.commit()
            logger.info(f"CollectionViewer: Created database records for {plugin_id}")

            return {'success': True, 'plugin_id': plugin_id, 'modules_created': modules_created}

        except Exception as e:
            logger.error(f"CollectionViewer: Database creation error: {e}")
            await db.rollback()
            return {'success': False, 'error': str(e)}

    async def _delete_database_records(self, user_id: str, plugin_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Delete database records"""
        try:
            module_delete_stmt = text("""
                DELETE FROM module
                WHERE plugin_id = :plugin_id AND user_id = :user_id
            """)

            module_result = await db.execute(module_delete_stmt, {
                'plugin_id': plugin_id,
                'user_id': user_id
            })

            deleted_modules = module_result.rowcount

            plugin_delete_stmt = text("""
                DELETE FROM plugin
                WHERE id = :plugin_id AND user_id = :user_id
            """)

            plugin_result = await db.execute(plugin_delete_stmt, {
                'plugin_id': plugin_id,
                'user_id': user_id
            })

            if plugin_result.rowcount == 0:
                await db.rollback()
                return {'success': False, 'error': 'Plugin not found'}

            await db.commit()
            logger.info(f"CollectionViewer: Deleted records for {plugin_id}")

            return {'success': True, 'deleted_modules': deleted_modules}

        except Exception as e:
            logger.error(f"CollectionViewer: Database deletion error: {e}")
            await db.rollback()
            return {'success': False, 'error': str(e)}

    # Compatibility methods
    async def install_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Install plugin for user"""
        try:
            existing_check = await self._check_existing_plugin(user_id, db)
            if existing_check['exists']:
                return {'success': False, 'error': 'Plugin already installed'}

            shared_path = self.shared_path
            shared_path.mkdir(parents=True, exist_ok=True)

            copy_result = await self._copy_plugin_files_impl(user_id, shared_path)
            if not copy_result['success']:
                return copy_result

            result = await self.install_for_user(user_id, db, shared_path)
            return result

        except Exception as e:
            logger.error(f"CollectionViewer: Install failed: {e}")
            return {'success': False, 'error': str(e)}

    async def delete_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Delete plugin for user"""
        return await self.uninstall_for_user(user_id, db)


# Standalone functions for remote installer compatibility
async def install_plugin(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = CollectionViewerLifecycleManager(plugins_base_dir)
    return await manager.install_plugin(user_id, db)

async def delete_plugin(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = CollectionViewerLifecycleManager(plugins_base_dir)
    return await manager.delete_plugin(user_id, db)
