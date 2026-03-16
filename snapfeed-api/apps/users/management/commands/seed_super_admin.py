from django.core.management.base import BaseCommand
from apps.users.models import User
from django.conf import settings


class Command(BaseCommand):
    help = "Seed Super Admin user"

    def handle(self, *args, **options):
        username = settings.SUPER_ADMIN_USERNAME
        password = settings.SUPER_ADMIN_PASSWORD

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "is_superuser": True,
            },
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(f"Successfully seeded super admin account!")
        else:
            self.stdout.write(f"Superadmin {username} already exists!")
