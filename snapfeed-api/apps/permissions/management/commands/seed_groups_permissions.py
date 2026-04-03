from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.permissions.constants import GROUP_PERMISSIONS_MAP


class Command(BaseCommand):
    """
    Management command to seed permissions to groups.
    """

    help = "Seed permissions to groups based on GROUP_PERMISSIONS_MAP"

    @transaction.atomic
    def handle(self, *args, **options):
        """
        Handle the command execution: Seed permissions to groups.
        """

        for group_name, permission_list in GROUP_PERMISSIONS_MAP.items():
            group = Group.objects.get(name=group_name)
            group.permissions.clear()

            for perm_str in permission_list:
                app_label, codename = perm_str.split(".")
                permission = Permission.objects.get(
                    codename=codename, content_type__app_label=app_label
                )
                group.permissions.add(permission)

        self.stdout.write(
            self.style.SUCCESS("Successfully seeded group - permissions!")
        )
