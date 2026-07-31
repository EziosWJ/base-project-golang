package dept

import "testing"

func TestValidInputRejectsMissingRequiredFields(t *testing.T) {
	if err := valid(Input{ParentID: 0, Status: StatusEnabled}); err == nil {
		t.Fatal("missing department fields were accepted")
	}
	if err := valid(Input{ParentID: 0, DeptName: "研发", DeptCode: "RND", Status: StatusEnabled}); err != nil {
		t.Fatalf("valid department input rejected: %v", err)
	}
}

func TestTreeSortsRootsAndChildren(t *testing.T) {
	result := tree([]Dept{{ID: 3, ParentID: 1, SortOrder: 1}, {ID: 1, ParentID: 0, SortOrder: 2}, {ID: 2, ParentID: 0, SortOrder: 1}})
	if len(result) != 2 || result[0].ID != 2 || result[1].ID != 1 || len(result[1].Children) != 1 || result[1].Children[0].ID != 3 {
		t.Fatalf("tree = %+v", result)
	}
}
