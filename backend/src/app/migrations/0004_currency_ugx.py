from django.db import migrations, models


def set_ugx(apps, schema_editor):
    for model_name in ("Product", "Order", "Transaction"):
        Model = apps.get_model("app", model_name)
        Model.objects.filter(currency="USD").update(currency="UGX")
        Model.objects.filter(currency="").update(currency="UGX")


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0003_create_superuser"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="currency",
            field=models.CharField(default="UGX", max_length=3),
        ),
        migrations.AlterField(
            model_name="order",
            name="currency",
            field=models.CharField(default="UGX", max_length=3),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="currency",
            field=models.CharField(default="UGX", max_length=3),
        ),
        migrations.RunPython(set_ugx, migrations.RunPython.noop),
    ]
