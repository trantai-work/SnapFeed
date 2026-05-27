from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.permissions.constants import Groups
from apps.users.models import User


class Command(BaseCommand):
    help = "Create or update a moderator account."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True, type=str)
        parser.add_argument("--password", required=True, type=str)
        parser.add_argument("--email", required=True, type=str)

    @transaction.atomic
    def handle(self, *args, **options):
        username = options["username"].strip()
        password = options["password"]
        email = options["email"].strip()

        group, _ = Group.objects.get_or_create(name=Groups.MODERATOR.value)
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_staff": True,
                "is_superuser": False,
            },
        )

        user.email = email
        user.is_staff = True
        user.is_superuser = False
        user.set_password(password)
        user.groups.add(group)
        user.save(update_fields=["email", "is_staff", "is_superuser", "password"])

        if created:
            self.stdout.write(
                self.style.SUCCESS(f"Created moderator account: {username}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Updated moderator account: {username}")
            )
