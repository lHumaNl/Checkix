import { Button, Space } from 'antd'

interface Category {
  id: string
  label: string
  icon: string
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string
  onSelectCategory: (category: string) => void
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <Space className="mt-4 w-full overflow-x-auto pb-2" size={8}>
      {categories.map((category) => (
        <Button
          key={category.id}
          type={selectedCategory === category.id ? 'primary' : 'default'}
          shape="round"
          onClick={() => onSelectCategory(category.id)}
          className="whitespace-nowrap"
        >
          <span aria-hidden="true">{category.icon}</span>
          {category.label}
        </Button>
      ))}
    </Space>
  )
}

export default CategoryFilter
