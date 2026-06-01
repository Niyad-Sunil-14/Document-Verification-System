from django.dispatch import Signal

# This signal will pass the 'email' string when fired
password_reset_requested = Signal()