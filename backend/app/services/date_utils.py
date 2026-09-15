from datetime import date


def month_bounds(day: date) -> tuple[date, date]:
    """Devuelve (primer dia del mes, primer dia del mes siguiente) para usar como rango [inicio, fin)."""
    start = day.replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def shift_month(day: date, delta: int) -> date:
    """Mueve `day` `delta` meses (puede ser negativo), siempre al dia 1 de ese mes."""
    month_index = day.month - 1 + delta
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)
