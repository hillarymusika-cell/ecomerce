"""Invalidate cache on catalog writes."""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Category, Order, Product, ProductImage
from . import cache_utils


@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
def product_changed(sender, instance, **kwargs):
    cache_utils.invalidate_product(getattr(instance, "slug", None))
    cache_utils.invalidate_dashboard()


@receiver(post_save, sender=ProductImage)
@receiver(post_delete, sender=ProductImage)
def product_image_changed(sender, instance, **kwargs):
    product = getattr(instance, "product", None)
    if product is not None:
        cache_utils.invalidate_product(getattr(product, "slug", None))


@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
def category_changed(sender, instance, **kwargs):
    cache_utils.invalidate_categories()
    cache_utils.invalidate_product()  # list filters by category
    cache_utils.invalidate_dashboard()


@receiver(post_save, sender=Order)
def order_changed(sender, instance, **kwargs):
    # Revenue / order counts on admin dashboard
    cache_utils.invalidate_dashboard()
    # Stock may have changed for line items – lists can show stale stock hints
    cache_utils.invalidate_product()
