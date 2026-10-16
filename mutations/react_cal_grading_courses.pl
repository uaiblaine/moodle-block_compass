s/courseids=\{data\.waitingcourseids\}/courseids={data.periods.flatMap((period) => period.courseids)}/;
