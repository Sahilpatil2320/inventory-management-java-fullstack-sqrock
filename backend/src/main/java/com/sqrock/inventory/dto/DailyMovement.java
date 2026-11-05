package com.sqrock.inventory.dto;

import java.time.LocalDate;

public record DailyMovement(LocalDate date, long stockIn, long stockOut) { }
