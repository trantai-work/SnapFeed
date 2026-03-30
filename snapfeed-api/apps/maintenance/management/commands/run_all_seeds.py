from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """
    Management command to run all seeds.
    """

    help = "Run all seed commands in correct order."

    def handle(self, *args, **options):
        """
        Handle run all seed commands in correct order.
        """

        seeds = [
            "seed_super_admin",
            "seed_groups",
            "seed_groups_permissions",
        ]

        for seed in seeds:
            self.stdout.write(self.style.NOTICE(f"Running {seed}..."))
            try:
                call_command(seed)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"{seed} failed: {e}"))

        self.stdout.write(self.style.SUCCESS("All seeds executed successfully."))
