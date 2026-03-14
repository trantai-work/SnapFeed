from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from django.db import transaction

from apps.permissions.constants import Groups


class Command(BaseCommand):
    """
    Management command to seed Groups for the application.
    """

    help = "Seed Groups for the application"

    @transaction.atomic
    def handle(self, *args, **options):
        """
        Handle the command execution: Seed Groups.
        """

        for group_name in Groups.values():
            group, created = Group.objects.get_or_create(name=group_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created Group: {group_name}"))

        self.stdout.write(self.style.SUCCESS("Successfully seeded all Groups!"))
