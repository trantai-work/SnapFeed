import random
from enum import Enum


class EnumChoices(Enum):
    """
    The utils helpe make the enum choices.
    """

    @classmethod
    def choices(cls):
        """
        The enum choices.
        """

        return [(choice.value, choice.name) for choice in cls]

    @classmethod
    def random(cls, not_values=None):
        """
        The random enum choices.
        """

        if not_values is None:
            not_values = []
        choices = [choice.value for choice in cls if choice.value not in not_values]
        return random.choice(choices)

    @classmethod
    def keys(cls):
        """
        Returns a list of all enum member names.
        """

        return [choice.name for choice in cls]

    @classmethod
    def values(cls):
        """
        Returns a list of all enum member values.
        """

        return [choice.value for choice in cls]
