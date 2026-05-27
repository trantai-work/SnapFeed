import calendar
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncDate, TruncMonth, TruncYear

from apps.videos.models import Video, VideoView
from apps.reports.models import VideoReport


def _get_growth_str(curr_val, prev_val):
    if prev_val == 0:
        return f"+100%" if curr_val > 0 else "0%"
    percent = ((curr_val - prev_val) / prev_val) * 100
    sign = "+" if percent > 0 else ""
    return f"{sign}{percent:.1f}%".replace(".0%", "%")


def _build_time_series_data(
    queryset,
    trunc_func,
    time_range: str,
    date_keys: list,
    pre_start_key=None,
    start_date=None,
    prev_start=None,
    prev_end=None,
):
    qs = (
        queryset.annotate(period=trunc_func)
        .values("period")
        .annotate(count=Count("id"))
    )
    data_dict = {}
    for row in qs:
        period = row["period"]
        if not period:
            continue
        if time_range in ["week", "month"]:
            key = period.date() if hasattr(period, "date") else period
        elif time_range == "year":
            key = period.strftime("%Y-%m")
        else:
            key = str(period.year)
        data_dict[key] = row["count"]

    values = [data_dict.get(k, 0) for k in date_keys]

    # Calculate column growths
    column_growths = []
    prev = data_dict.get(pre_start_key, 0) if pre_start_key else 0
    for v in values:
        column_growths.append(_get_growth_str(v, prev))
        prev = v

    curr_total = sum(values)

    # prev_total exactly up to prev_end
    prev_total = queryset.filter(
        created_at__gte=prev_start, created_at__lte=prev_end
    ).count()
    growth_str = _get_growth_str(curr_total, prev_total)

    return values, curr_total, column_growths, growth_str


def get_system_stats_data(time_range: str = "week") -> dict:
    now = timezone.now()

    date_keys = []
    labels = []
    pre_start_key = None

    if time_range == "week":
        # WTD: Monday to today
        weekday = now.weekday()
        start_date = (now - timedelta(days=weekday)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        prev_start = start_date - timedelta(days=7)
        prev_end = now - timedelta(days=7)
        pre_start_key = (start_date - timedelta(days=1)).date()

        days_to_show = weekday + 1
        for i in range(days_to_show):
            d = start_date + timedelta(days=i)
            date_keys.append(d.date())
            labels.append(["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i])
        trunc_func = TruncDate("created_at")

    elif time_range == "month":
        # MTD: 1st of month to today
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if start_date.month == 1:
            prev_start = start_date.replace(year=start_date.year - 1, month=12)
            max_day = calendar.monthrange(now.year - 1, 12)[1]
            prev_end = now.replace(
                year=now.year - 1, month=12, day=min(now.day, max_day)
            )
        else:
            prev_start = start_date.replace(month=start_date.month - 1)
            max_day = calendar.monthrange(now.year, now.month - 1)[1]
            prev_end = now.replace(month=now.month - 1, day=min(now.day, max_day))

        pre_start_key = (start_date - timedelta(days=1)).date()

        days_to_show = now.day
        for i in range(days_to_show):
            d = start_date + timedelta(days=i)
            date_keys.append(d.date())
            labels.append(d.strftime("%d/%m"))
        trunc_func = TruncDate("created_at")

    elif time_range == "year":
        # YTD: Jan to current month
        start_date = now.replace(
            month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )
        prev_start = start_date.replace(year=start_date.year - 1)
        max_day = calendar.monthrange(now.year - 1, now.month)[1]
        prev_end = now.replace(year=now.year - 1, day=min(now.day, max_day))

        pre_start_key = prev_start.replace(month=12).strftime("%Y-%m")

        months_to_show = now.month
        curr = start_date
        for i in range(months_to_show):
            date_keys.append(curr.strftime("%Y-%m"))
            labels.append(f"T{curr.month}")
            if curr.month == 12:
                curr = curr.replace(year=curr.year + 1, month=1)
            else:
                curr = curr.replace(month=curr.month + 1)
        trunc_func = TruncMonth("created_at")

    else:  # years
        start_date = now.replace(
            year=max(2020, now.year - 4),
            month=1,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        prev_start = start_date.replace(year=start_date.year - 5)
        prev_end = now.replace(year=start_date.year - 1)

        pre_start_key = str(start_date.year - 1)

        years_to_show = now.year - start_date.year + 1
        for i in range(years_to_show):
            y = start_date.year + i
            date_keys.append(str(y))
            labels.append(str(y))
        trunc_func = TruncYear("created_at")

    min_date = prev_start
    if time_range == "week" or time_range == "month":
        pre_start_date = start_date - timedelta(days=1)
        if pre_start_date < min_date:
            min_date = pre_start_date

    video_qs = Video.all_objects.filter(created_at__gte=min_date)
    view_qs = VideoView.objects.filter(created_at__gte=min_date)
    report_qs = VideoReport.all_objects.filter(created_at__gte=min_date)

    v_vals, v_tot, v_cg, v_growth = _build_time_series_data(
        video_qs,
        trunc_func,
        time_range,
        date_keys,
        pre_start_key,
        start_date,
        prev_start,
        prev_end,
    )
    vw_vals, vw_tot, vw_cg, vw_growth = _build_time_series_data(
        view_qs,
        trunc_func,
        time_range,
        date_keys,
        pre_start_key,
        start_date,
        prev_start,
        prev_end,
    )
    r_vals, r_tot, r_cg, r_growth = _build_time_series_data(
        report_qs,
        trunc_func,
        time_range,
        date_keys,
        pre_start_key,
        start_date,
        prev_start,
        prev_end,
    )

    return {
        "uploads": {
            "dates": labels,
            "values": v_vals,
            "columnGrowths": v_cg,
            "totalValue": f"{v_tot:,}",
            "growth": v_growth,
            "isNegative": v_growth.startswith("-"),
        },
        "views": {
            "dates": labels,
            "values": vw_vals,
            "columnGrowths": vw_cg,
            "totalValue": f"{vw_tot:,}",
            "growth": vw_growth,
            "isNegative": vw_growth.startswith("-"),
        },
        "reports": {
            "dates": labels,
            "values": r_vals,
            "columnGrowths": r_cg,
            "totalValue": f"{r_tot:,}",
            "growth": r_growth,
            "isNegative": not r_growth.startswith("-"),
        },
    }
