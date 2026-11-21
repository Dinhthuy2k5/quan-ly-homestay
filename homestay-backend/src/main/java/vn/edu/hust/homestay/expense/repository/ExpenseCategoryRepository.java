package vn.edu.hust.homestay.expense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.homestay.expense.entity.ExpenseCategory;

import java.util.List;
import java.util.Optional;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Long> {
    Optional<ExpenseCategory> findByIdAndHomestayId(Long id, Long homestayId);
    List<ExpenseCategory> findByHomestayIdOrderByNameAsc(Long homestayId);
    List<ExpenseCategory> findByHomestayIdAndIdIn(Long homestayId, List<Long> ids);
    boolean existsByHomestayIdAndNameIgnoreCase(Long homestayId, String name);
    boolean existsByHomestayIdAndNameIgnoreCaseAndIdNot(Long homestayId, String name, Long id);
}
