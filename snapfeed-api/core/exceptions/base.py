from core.messages import ERROR_MESSAGES


class DomainException(Exception):
    message_key = "something_went_wrong"

    def __init__(self, **params):
        self.params = params
        super().__init__(self.get_message())

    def get_message(self):
        template = ERROR_MESSAGES.get(self.message_key, self.message_key)
        try:
            return template.format(**self.params)
        except KeyError:
            return self.message_key
