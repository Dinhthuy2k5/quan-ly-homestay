package vn.edu.hust.homestay.expense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.homestay.expense.entity.Expense;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {}
